import '../generated/template_node.dart';
import 'binding.dart';

/// Resolve as expressões dentro de um valor de prop, recursando em listas/mapas.
Object? _resolveValue(
    Object? value, Map<String, Object?> scope, String? locale) {
  if (value is String) return evaluateExpression(value, scope, locale: locale);
  if (value is List) {
    return value.map((item) => _resolveValue(item, scope, locale)).toList();
  }
  if (value is Map) {
    final Map<String, Object?> out = <String, Object?>{};
    value.forEach((key, item) {
      out[key.toString()] = _resolveValue(item, scope, locale);
    });
    return out;
  }
  return value;
}

/// Percorre a árvore TemplateNode, resolvendo `{{ ... }}` nas props e expandindo
/// filhos com `dataBind` (N× com `$item`/`$index`). Espelho do `resolveTemplate`
/// do engine TS — a mesma "template + scope → árvore resolvida" que torna o
/// renderer nativo conforme aos vetores do core (ADR 0005 §2).
TemplateNode resolveTemplate(
  TemplateNode node,
  Map<String, Object?> scope, {
  String? locale,
}) {
  final Map<String, Object?>? props = node.props;
  final List<TemplateNode>? body = node.body;
  final List<TemplateNode>? children = node.children;
  return TemplateNode(
    type: node.type,
    id: node.id,
    props: props == null
        ? null
        : _resolveValue(props, scope, locale)! as Map<String, Object?>,
    body: body == null ? null : _resolveChildren(body, scope, locale),
    children:
        children == null ? null : _resolveChildren(children, scope, locale),
  );
}

List<TemplateNode> _resolveChildren(
  List<TemplateNode> children,
  Map<String, Object?> scope,
  String? locale,
) {
  final List<TemplateNode> out = <TemplateNode>[];
  for (final TemplateNode child in children) {
    final String? dataBind = child.dataBind;
    if (dataBind == null) {
      out.add(resolveTemplate(child, scope, locale: locale));
      continue;
    }
    final Object? items = evaluateExpression(dataBind, scope, locale: locale);
    if (items is! List) continue;
    for (int index = 0; index < items.length; index += 1) {
      final Map<String, Object?> itemScope = <String, Object?>{
        ...scope,
        r'$item': items[index],
        r'$index': index,
      };
      out.add(resolveTemplate(child, itemScope, locale: locale));
    }
  }
  return out;
}
