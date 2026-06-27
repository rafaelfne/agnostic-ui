/// Validação **dependency-free** de props contra um JSON Schema (tratado como dado):
/// presença de `required` + tipo primitivo das `properties` declaradas. Espelho de
/// `validatePropsAgainstSchema` do core (ADR 0006, G6) — não substitui um validador
/// JSON Schema completo; é o gate barato que pega o erro de config comum. Nunca lança:
/// retorna a lista de problemas (a tela nunca quebra).
List<String> validatePropsAgainstSchema(
  Map<String, Object?> schema,
  Map<String, Object?> props,
) {
  final issues = <String>[];

  final Object? required = schema['required'];
  if (required is List<Object?>) {
    for (final Object? name in required) {
      if (name is String && !props.containsKey(name)) {
        issues.add('missing required prop: $name');
      }
    }
  }

  final Object? properties = schema['properties'];
  if (properties is Map<String, Object?>) {
    properties.forEach((String name, Object? spec) {
      if (!props.containsKey(name)) return;
      if (spec is Map<String, Object?>) {
        final Object? type = spec['type'];
        if (type is String && !_typeMatches(props[name], type)) {
          issues.add('prop $name: expected $type');
        }
      }
    });
  }

  return issues;
}

bool _typeMatches(Object? value, String type) {
  switch (type) {
    case 'string':
      return value is String;
    case 'number':
    case 'integer':
      return value is num;
    case 'boolean':
      return value is bool;
    case 'array':
      return value is List<Object?>;
    case 'object':
      return value is Map<String, Object?>;
    default:
      return true;
  }
}
