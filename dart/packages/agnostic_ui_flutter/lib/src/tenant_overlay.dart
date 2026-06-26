import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'sdui_registry.dart';
import 'sdui_scope.dart';

/// Exemplo de **overlay de registry por tenant** (F9.4): componentes `partnerco-*`
/// que estendem/sobrepõem o catálogo base **sem tocá-lo**, via
/// `SduiRegistry.withOverrides`. O host monta o registry do tenant assim:
///
/// ```dart
/// final registry = createDefaultRegistry().withOverrides(partnercoOverlay);
/// ```
///
/// `partnerco-balance-card` lê o tema do tenant via `SduiScope` (F9.3).

String _p(TemplateNode node, String key) => node.props?[key]?.toString() ?? '';

Widget _partnercoBalanceCard(BuildContext c, TemplateNode n, List<Widget> ch) {
  final Color color = SduiScope.themeOf(c)?.primary ?? Colors.indigo;
  return Card(
    color: color,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(_p(n, 'label'), style: const TextStyle(color: Colors.white70)),
          Text(
            _p(n, 'amount'),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    ),
  );
}

Widget _partnercoQuickActions(
        BuildContext c, TemplateNode n, List<Widget> ch) =>
    Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: ch);

/// Builders do tenant `partnerco` (exemplo de overlay).
final Map<String, SduiBuilder> partnercoOverlay = <String, SduiBuilder>{
  'partnerco-balance-card': _partnercoBalanceCard,
  'partnerco-quick-actions': _partnercoQuickActions,
};
