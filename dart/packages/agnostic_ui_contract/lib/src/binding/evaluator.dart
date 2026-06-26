import 'errors.dart';
import 'expression.dart';
import 'functions.dart';
import 'safe_path.dart';

/// Limita o aninhamento do AST; expressões não têm loops, então isso limita o
/// trabalho total. Espelha o `evaluate.ts`.
const int _maxDepth = 64;

/// Verdade no estilo `Boolean(value)` do JS: `null`/`false`/`0`/`NaN`/`''` são
/// falsos; Map/List (mesmo vazios) e demais valores são verdadeiros.
bool _truthy(Object? value) {
  if (value == null) return false;
  if (value is bool) return value;
  if (value is num) return value != 0 && !value.isNaN;
  if (value is String) return value.isNotEmpty;
  return true;
}

num _asNumber(Object? value) {
  if (value is num && value.isFinite) return value;
  throw ExpressionError('expected a finite number, got ${value.runtimeType}');
}

ExprNode _argAt(List<ExprNode> args, int index) {
  if (index >= args.length) {
    throw ExpressionError('missing operand at index $index');
  }
  return args[index];
}

Object? _evalOp(
  String op,
  List<ExprNode> args,
  Map<String, Object?> scope,
  EvalContext ctx,
  int depth,
) {
  Object? ev(ExprNode node) => evaluate(node, scope, ctx, depth + 1);

  if (op == '!') return !_truthy(ev(_argAt(args, 0)));
  if (op == '&&') {
    final Object? left = ev(_argAt(args, 0));
    return _truthy(left) ? ev(_argAt(args, 1)) : left;
  }
  if (op == '||') {
    final Object? left = ev(_argAt(args, 0));
    return _truthy(left) ? left : ev(_argAt(args, 1));
  }

  final Object? a = ev(_argAt(args, 0));
  final Object? b = ev(_argAt(args, 1));
  switch (op) {
    case '==':
      return a == b;
    case '!=':
      return a != b;
    case '<':
      return _asNumber(a) < _asNumber(b);
    case '<=':
      return _asNumber(a) <= _asNumber(b);
    case '>':
      return _asNumber(a) > _asNumber(b);
    case '>=':
      return _asNumber(a) >= _asNumber(b);
    case '+':
      return _asNumber(a) + _asNumber(b);
    case '-':
      return _asNumber(a) - _asNumber(b);
    case '*':
      return _asNumber(a) * _asNumber(b);
    case '/':
      final num divisor = _asNumber(b);
      if (divisor == 0) throw ExpressionError('division by zero');
      return _asNumber(a) / divisor;
    case '%':
      final num divisor = _asNumber(b);
      if (divisor == 0) throw ExpressionError('modulo by zero');
      return _asNumber(a) % divisor;
    default:
      throw ExpressionError('unknown operator: $op');
  }
}

/// Avalia um nó do AST contra o escopo. Sem eval, sem globais, limitado.
Object? evaluate(
  ExprNode node,
  Map<String, Object?> scope,
  EvalContext ctx, [
  int depth = 0,
]) {
  if (depth > _maxDepth) throw ExpressionError('expression nesting too deep');
  switch (node) {
    case LitNode(:final Object? value):
      return value;
    case PathNode(:final String path):
      return readPath(path, scope);
    case OpNode(:final String op, :final List<ExprNode> args):
      return _evalOp(op, args, scope, ctx, depth);
    case CondNode(:final condition, :final then, :final otherwise):
      return _truthy(evaluate(condition, scope, ctx, depth + 1))
          ? evaluate(then, scope, ctx, depth + 1)
          : evaluate(otherwise, scope, ctx, depth + 1);
    case CallNode(:final String fn, :final List<ExprNode> args):
      final CuratedFunction? handler = curatedFunctions[fn];
      if (handler == null) throw ExpressionError('unknown function: $fn');
      final List<Object?> callArgs =
          args.map((arg) => evaluate(arg, scope, ctx, depth + 1)).toList();
      return handler(callArgs, ctx);
  }
}
