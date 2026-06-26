import 'errors.dart';

const Set<String> _forbidden = <String>{
  '__proto__',
  'prototype',
  'constructor'
};

/// Lê um path pontuado do escopo com segurança — espelho do `safePath.ts`:
/// só própria chave (Map) ou índice (List), nunca a cadeia de protótipo; hop
/// ausente → `null`; bloqueia segmentos de poluição de protótipo.
Object? readPath(String path, Object? scope) {
  Object? current = scope;
  for (final String segment in path.split('.')) {
    if (_forbidden.contains(segment)) {
      throw ExpressionError('forbidden path segment: $segment');
    }
    if (current is Map) {
      if (!current.containsKey(segment)) return null;
      current = current[segment];
    } else if (current is List) {
      final int? index = int.tryParse(segment);
      if (index == null || index < 0 || index >= current.length) return null;
      current = current[index];
    } else {
      return null;
    }
  }
  return current;
}
