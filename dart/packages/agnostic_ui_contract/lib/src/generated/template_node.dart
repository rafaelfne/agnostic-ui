// GERADO por dart/tool/generate_models.dart — não editar à mão.
// Fonte: packages/core/schema (JSON Schema do @yukilabs/agnostic-ui-core).
// ignore_for_file: type=lint

class TemplateNode {
  const TemplateNode({
    required this.type,
    this.id,
    this.props,
    this.body,
    this.children,
    this.dataBind,
  });

  factory TemplateNode.fromJson(Map<String, Object?> json) => TemplateNode(
    type: json['type']! as String,
    id: json['id'] == null ? null : json['id']! as String,
    props: json['props'] == null ? null : (json['props']! as Map<String, Object?>).map((String k, Object? e) => MapEntry<String, Object?>(k, e)),
    body: json['body'] == null ? null : (json['body']! as List<Object?>).map((Object? e) => TemplateNode.fromJson(e as Map<String, Object?>)).toList(),
    children: json['children'] == null ? null : (json['children']! as List<Object?>).map((Object? e) => TemplateNode.fromJson(e as Map<String, Object?>)).toList(),
    dataBind: json['dataBind'] == null ? null : json['dataBind']! as String,
  );

  final String type;
  final String? id;
  final Map<String, Object?>? props;
  final List<TemplateNode>? body;
  final List<TemplateNode>? children;
  final String? dataBind;

  Map<String, Object?> toJson() => <String, Object?>{
    'type': type,
    if (id != null) 'id': id!,
    if (props != null) 'props': props!.map((String k, Object? e) => MapEntry<String, Object?>(k, e)),
    if (body != null) 'body': body!.map((TemplateNode e) => e.toJson()).toList(),
    if (children != null) 'children': children!.map((TemplateNode e) => e.toJson()).toList(),
    if (dataBind != null) 'dataBind': dataBind!,
  };
}

