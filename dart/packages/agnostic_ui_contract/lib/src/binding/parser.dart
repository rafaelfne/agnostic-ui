import 'errors.dart';
import 'expression.dart';
import 'functions.dart';

/// Espelho do `parse.ts`: tokenizer + parser de precedência que transforma a
/// string `{{ ... }}` no AST fechado, sem eval. Gramática: aritmética,
/// comparações, `&&`/`||`/`!`, ternário, chamadas, pipes e interpolação.

final RegExp _placeholder = RegExp(r'\{\{\s*([\s\S]*?)\s*\}\}');
final Set<String> _functionNames = curatedFunctions.keys.toSet();

/// Converte uma string de config em AST. Placeholder inteiro preserva o tipo;
/// interpolação vira `concat`; sem placeholder é literal string.
ExprNode parsePlaceholder(String input) {
  final List<_Part> parts = _splitInterpolation(input);
  if (parts.length == 1 && parts.first.isText) {
    return LitNode(parts.first.value);
  }
  final List<ExprNode> nodes = parts
      .map((part) =>
          part.isText ? LitNode(part.value) : parseExpression(part.value))
      .toList();
  if (nodes.length == 1) return nodes.first;
  return CallNode('concat', nodes);
}

/// Faz parse de uma única expressão (o interior de `{{ ... }}`).
ExprNode parseExpression(String src) {
  final List<_Token> tokens = _tokenize(src);
  if (tokens.isEmpty) throw ExpressionError('empty expression in: $src');
  return _Parser(tokens, src).parse();
}

class _Part {
  _Part(this.isText, this.value);
  final bool isText;
  final String value;
}

List<_Part> _splitInterpolation(String input) {
  final List<_Part> parts = <_Part>[];
  int last = 0;
  for (final RegExpMatch match in _placeholder.allMatches(input)) {
    if (match.start > last) {
      parts.add(_Part(true, input.substring(last, match.start)));
    }
    parts.add(_Part(false, match.group(1)!));
    last = match.end;
  }
  if (last < input.length) parts.add(_Part(true, input.substring(last)));
  if (parts.isEmpty) parts.add(_Part(true, ''));
  return parts;
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

enum _TokType { number, string, path, ident, punct }

class _Token {
  _Token(this.type, this.value);
  final _TokType type;
  final Object value;
}

const List<String> _punctuators = <String>[
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '|',
  '(',
  ')',
  ',',
  '?',
  ':',
  '!',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
];

final RegExp _ws = RegExp(r'\s');
final RegExp _digit = RegExp(r'[0-9]');
final RegExp _identStart = RegExp(r'[A-Za-z_$]');
final RegExp _identPart = RegExp(r'[A-Za-z0-9_$.]');

List<_Token> _tokenize(String src) {
  final List<_Token> tokens = <_Token>[];
  int i = 0;
  while (i < src.length) {
    final String c = src[i];
    if (_ws.hasMatch(c)) {
      i += 1;
      continue;
    }
    if (c == '"' || c == "'") {
      final StringBuffer buffer = StringBuffer();
      int j = i + 1;
      while (j < src.length && src[j] != c) {
        if (src[j] == r'\' && j + 1 < src.length) {
          buffer.write(src[j + 1]);
          j += 2;
        } else {
          buffer.write(src[j]);
          j += 1;
        }
      }
      if (j >= src.length) {
        throw ExpressionError('unterminated string in: $src');
      }
      tokens.add(_Token(_TokType.string, buffer.toString()));
      i = j + 1;
      continue;
    }
    if (_digit.hasMatch(c) ||
        (c == '.' && i + 1 < src.length && _digit.hasMatch(src[i + 1]))) {
      int j = i;
      while (j < src.length && (_digit.hasMatch(src[j]) || src[j] == '.')) {
        j += 1;
      }
      final String text = src.substring(i, j);
      final num? value = num.tryParse(text);
      if (value == null) throw ExpressionError('invalid number: $text');
      tokens.add(_Token(_TokType.number, value));
      i = j;
      continue;
    }
    if (_identStart.hasMatch(c)) {
      int j = i + 1;
      while (j < src.length && _identPart.hasMatch(src[j])) {
        j += 1;
      }
      final String value = src.substring(i, j);
      tokens.add(
          _Token(value.contains('.') ? _TokType.path : _TokType.ident, value));
      i = j;
      continue;
    }
    final String? punct = _matchPunct(src, i);
    if (punct == null) {
      throw ExpressionError("unexpected character '$c' in: $src");
    }
    tokens.add(_Token(_TokType.punct, punct));
    i += punct.length;
  }
  return tokens;
}

String? _matchPunct(String src, int i) {
  for (final String p in _punctuators) {
    if (src.startsWith(p, i)) return p;
  }
  return null;
}

// ── Parser (precedence climbing) ─────────────────────────────────────────────

const List<List<String>> _binaryTiers = <List<String>>[
  <String>['||'],
  <String>['&&'],
  <String>['==', '!='],
  <String>['<', '<=', '>', '>='],
  <String>['+', '-'],
  <String>['*', '/', '%'],
];

class _Parser {
  _Parser(this._tokens, this._src);
  final List<_Token> _tokens;
  final String _src;
  int _pos = 0;

  ExprNode parse() {
    final ExprNode node = _pipe();
    if (_pos < _tokens.length) {
      throw ExpressionError('unexpected trailing input in: $_src');
    }
    return node;
  }

  _Token? _peek() => _pos < _tokens.length ? _tokens[_pos] : null;

  void _eatPunct(String value) {
    final _Token? token = _peek();
    if (token == null || token.type != _TokType.punct || token.value != value) {
      throw ExpressionError("expected '$value' in: $_src");
    }
    _pos += 1;
  }

  bool _matchPunctTok(String value) {
    final _Token? token = _peek();
    if (token != null && token.type == _TokType.punct && token.value == value) {
      _pos += 1;
      return true;
    }
    return false;
  }

  ExprNode _pipe() {
    ExprNode left = _ternary();
    while (_matchPunctTok('|')) {
      final _Token? token = _peek();
      if (token == null || token.type != _TokType.ident) {
        throw ExpressionError("expected a function after '|' in: $_src");
      }
      _pos += 1;
      final String name = token.value as String;
      if (!_functionNames.contains(name)) {
        throw ExpressionError("unknown function '$name' in: $_src");
      }
      final List<ExprNode> args = <ExprNode>[left];
      if (_matchPunctTok('(')) {
        if (!_matchPunctTok(')')) {
          do {
            args.add(_ternary());
          } while (_matchPunctTok(','));
          _eatPunct(')');
        }
      }
      left = CallNode(name, args);
    }
    return left;
  }

  ExprNode _ternary() {
    final ExprNode condition = _binary(0);
    if (_matchPunctTok('?')) {
      final ExprNode thenNode = _ternary();
      _eatPunct(':');
      final ExprNode elseNode = _ternary();
      return CondNode(condition, thenNode, elseNode);
    }
    return condition;
  }

  ExprNode _binary(int tier) {
    if (tier >= _binaryTiers.length) return _unary();
    ExprNode left = _binary(tier + 1);
    while (true) {
      final _Token? token = _peek();
      final bool isOp = token != null &&
          token.type == _TokType.punct &&
          _binaryTiers[tier].contains(token.value);
      if (!isOp) return left;
      final String op = token.value as String;
      _pos += 1;
      final ExprNode right = _binary(tier + 1);
      left = OpNode(op, <ExprNode>[left, right]);
    }
  }

  ExprNode _unary() {
    if (_matchPunctTok('!')) return OpNode('!', <ExprNode>[_unary()]);
    if (_matchPunctTok('-')) {
      final ExprNode operand = _unary();
      if (operand is LitNode && operand.value is num) {
        return LitNode(-(operand.value as num));
      }
      return OpNode('-', <ExprNode>[const LitNode(0), operand]);
    }
    return _primary();
  }

  ExprNode _primary() {
    final _Token? token = _peek();
    if (token == null) {
      throw ExpressionError('unexpected end of expression in: $_src');
    }
    switch (token.type) {
      case _TokType.number:
      case _TokType.string:
        _pos += 1;
        return LitNode(token.value);
      case _TokType.path:
        _pos += 1;
        return PathNode(token.value as String);
      case _TokType.ident:
        _pos += 1;
        final String name = token.value as String;
        if (name == 'true') return const LitNode(true);
        if (name == 'false') return const LitNode(false);
        if (name == 'null') return const LitNode(null);
        final _Token? next = _peek();
        if (next != null && next.type == _TokType.punct && next.value == '(') {
          return _call(name);
        }
        return PathNode(name);
      case _TokType.punct:
        if (token.value == '(') {
          _pos += 1;
          final ExprNode node = _ternary();
          _eatPunct(')');
          return node;
        }
        throw ExpressionError("unexpected token '${token.value}' in: $_src");
    }
  }

  ExprNode _call(String name) {
    if (!_functionNames.contains(name)) {
      throw ExpressionError("unknown function '$name' in: $_src");
    }
    _eatPunct('(');
    final List<ExprNode> args = <ExprNode>[];
    if (!_matchPunctTok(')')) {
      do {
        args.add(_ternary());
      } while (_matchPunctTok(','));
      _eatPunct(')');
    }
    return CallNode(name, args);
  }
}
