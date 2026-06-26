/// Espelho Dart do contrato SDUI definido em `@yukilabs/agnostic-ui-core`.
///
/// Reexporta os modelos gerados e o interpretador de data-binding (parser +
/// avaliador + funções + resolveTemplate), espelho do engine TS — a mesma
/// resolução que torna o renderer nativo conforme aos vetores do core (ADR 0005).
library;

export 'src/action/action_def.dart';
export 'src/binding/binding.dart' show evaluateExpression;
export 'src/binding/errors.dart' show ExpressionError;
export 'src/binding/functions.dart' show EvalContext, defaultLocale;
export 'src/binding/resolve_template.dart' show resolveTemplate;
export 'src/contract_meta.dart';
export 'src/generated/models.dart';
export 'src/token/sandbox_marker.dart';
