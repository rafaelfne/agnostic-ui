/// Erro de avaliação/parse de expressão. Espelha o `ExpressionError` do engine TS.
class ExpressionError implements Exception {
  ExpressionError(this.message);
  final String message;

  @override
  String toString() => 'ExpressionError: $message';
}
