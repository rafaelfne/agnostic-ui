import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/widgets.dart';

/// Constrói o widget de um nó já resolvido, dados seus filhos já compostos.
typedef SduiBuilder = Widget Function(
  BuildContext context,
  TemplateNode node,
  List<Widget> children,
);

/// Mapa fechado `type` → builder, com **fallback gracioso** para tipos
/// desconhecidos: a tela nunca quebra (placeholder vazio) e o `type` ausente é
/// reportado por telemetria (ADR 0005 §6).
class SduiRegistry {
  SduiRegistry(Map<String, SduiBuilder> builders, {this.onUnknownType})
      : _builders = Map<String, SduiBuilder>.unmodifiable(builders);

  final Map<String, SduiBuilder> _builders;
  final void Function(String type)? onUnknownType;

  bool contains(String type) => _builders.containsKey(type);

  Widget build(BuildContext context, TemplateNode node, List<Widget> children) {
    final SduiBuilder? builder = _builders[node.type];
    if (builder == null) {
      onUnknownType?.call(node.type);
      return const SizedBox.shrink();
    }
    return builder(context, node, children);
  }

  /// Overlay por tenant: registra/sobrescreve builders sem tocar a base (F9.4).
  SduiRegistry withOverrides(Map<String, SduiBuilder> overrides) =>
      SduiRegistry(
        <String, SduiBuilder>{..._builders, ...overrides},
        onUnknownType: onUnknownType,
      );
}
