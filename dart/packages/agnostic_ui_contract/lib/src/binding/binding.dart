import 'evaluator.dart';
import 'expression.dart';
import 'functions.dart';
import 'parser.dart';

/// Avalia uma string placeholder (`{{ ... }}`, com a gramática rica) contra o
/// escopo. Facade do binding — espelha o `evaluateExpression` do engine TS.
/// `locale` alimenta as funções de formatação (default `en-US`).
Object? evaluateExpression(
  String input,
  Map<String, Object?> scope, {
  String? locale,
}) {
  final ExprNode node = parsePlaceholder(input);
  return evaluate(node, scope, EvalContext(locale: locale ?? defaultLocale));
}
