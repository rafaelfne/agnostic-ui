import 'package:intl/intl.dart';

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
/// (`currency`/`percent`/`date`) usam `intl` com o locale da avaliação; `date`
/// fixa UTC para reprodutibilidade. (A paridade exata de símbolo de moeda com o
/// `Intl` do JS é um eixo separado — por isso não entram nos vetores de
/// conformance.)
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
  'currency': (args, ctx) {
    final String code = toText(_arg(args, 1));
    if (code.isEmpty) {
      throw ExpressionError('currency(value, code): missing currency code');
    }
    return NumberFormat.simpleCurrency(locale: ctx.locale, name: code)
        .format(toNumber(_arg(args, 0)));
  },
  'percent': (args, ctx) {
    final Object? rawDigits = _arg(args, 1);
    final int digits = rawDigits is num ? rawDigits.toInt() : 0;
    return NumberFormat.decimalPercentPattern(
      locale: ctx.locale,
      decimalDigits: digits,
    ).format(toNumber(_arg(args, 0)));
  },
  // `date` requer `initializeDateFormatting(locale)` (intl) para locales fora do
  // default en-US — o host inicializa antes de renderizar.
  'date': (args, ctx) {
    final Object? input = _arg(args, 0);
    final DateTime date;
    try {
      date = input is num
          ? DateTime.fromMillisecondsSinceEpoch(input.toInt(), isUtc: true)
          : DateTime.parse(toText(input)).toUtc();
    } on FormatException {
      throw ExpressionError('date(): invalid date ${toText(input)}');
    }
    return DateFormat.yMd(ctx.locale).format(date);
  },
};
