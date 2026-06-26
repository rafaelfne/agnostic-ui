import 'errors.dart';

/// Locale usado pelas funções de formatação quando nenhum é informado.
const String defaultLocale = 'en-US';

/// Contexto ambiente e determinístico passado a toda função curada.
class EvalContext {
  const EvalContext({this.locale = defaultLocale});
  final String locale;
}

typedef CuratedFunction = Object? Function(List<Object?> args, EvalContext ctx);

String toText(Object? value) => value == null ? '' : value.toString();

num toNumber(Object? value) {
  if (value is num) return value;
  final num? parsed = num.tryParse(toText(value));
  if (parsed == null) {
    throw ExpressionError('expected a finite number, got ${value.runtimeType}');
  }
  return parsed;
}

Object? _arg(List<Object?> args, int index) =>
    index < args.length ? args[index] : null;

/// Biblioteca curada de funções (espelho do `functions.ts`). Pura dado
/// `(args, ctx)`: sem I/O, sem globais, sem relógio. As funções locale-aware
/// (`currency`/`percent`/`date`) chegam em F2.2 (intl).
final Map<String, CuratedFunction> curatedFunctions = <String, CuratedFunction>{
  'upper': (args, ctx) => toText(_arg(args, 0)).toUpperCase(),
  'lower': (args, ctx) => toText(_arg(args, 0)).toLowerCase(),
  'uppercase': (args, ctx) => toText(_arg(args, 0)).toUpperCase(),
  'concat': (args, ctx) => args.map(toText).join(),
  'coalesce': (args, ctx) {
    for (final Object? arg in args) {
      if (arg != null) return arg;
    }
    return null;
  },
  'format': (args, ctx) {
    final Object? value = _arg(args, 0);
    if (value is num) {
      final Object? rawDigits = _arg(args, 1);
      final int digits = rawDigits is num ? rawDigits.toInt() : 0;
      return value.toStringAsFixed(digits.clamp(0, 20));
    }
    return toText(value);
  },
  'len': (args, ctx) {
    final Object? value = _arg(args, 0);
    if (value is String) return value.length;
    if (value is List) return value.length;
    return 0;
  },
};
