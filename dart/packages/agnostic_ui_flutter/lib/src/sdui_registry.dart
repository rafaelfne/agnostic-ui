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
  SduiRegistry(
    Map<String, SduiBuilder> builders, {
    this.onUnknownType,
    Map<String, Map<String, Object?>> contracts =
        const <String, Map<String, Object?>>{},
  })  : _builders = Map<String, SduiBuilder>.unmodifiable(builders),
        _contracts = Map<String, Map<String, Object?>>.unmodifiable(contracts);

  final Map<String, SduiBuilder> _builders;
  // `type` → props schema (JSON Schema como dado) do ComponentContract (ADR 0006, G6).
  final Map<String, Map<String, Object?>> _contracts;
  final void Function(String type)? onUnknownType;

  bool contains(String type) => _builders.containsKey(type);

  /// Props schema do contrato do tipo, se registrado — a interface da IA (G6).
  Map<String, Object?>? propsSchemaFor(String type) => _contracts[type];

  /// Valida as props de um nó contra o contrato do tipo; `[]` se não há contrato.
  List<String> validateProps(String type, Map<String, Object?> props) {
    final Map<String, Object?>? schema = _contracts[type];
    return schema == null
        ? <String>[]
        : validatePropsAgainstSchema(schema, props);
  }

  Widget build(BuildContext context, TemplateNode node, List<Widget> children) {
    final SduiBuilder? builder = _builders[node.type];
    if (builder == null) {
      onUnknownType?.call(node.type);
      return const SizedBox.shrink();
    }
    return builder(context, node, children);
  }

  /// Overlay por tenant: registra/sobrescreve builders (e contratos) sem tocar a base (F9.4).
  SduiRegistry withOverrides(
    Map<String, SduiBuilder> overrides, {
    Map<String, Map<String, Object?>> contracts =
        const <String, Map<String, Object?>>{},
  }) =>
      SduiRegistry(
        <String, SduiBuilder>{..._builders, ...overrides},
        onUnknownType: onUnknownType,
        contracts: <String, Map<String, Object?>>{..._contracts, ...contracts},
      );
}
