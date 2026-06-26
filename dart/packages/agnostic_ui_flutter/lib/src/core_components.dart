import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'cards.dart';
import 'headers.dart';
import 'lists.dart';
import 'sdui_registry.dart';

/// Primitivos Core UI (F2.6): `text`, `button`, `icon`, `input`, `row`,
/// `container`. Lêem as props já resolvidas (binding aplicado no
/// resolveTemplate). Builders reativos (botão) ganham o Dispatcher em F4.

String _str(TemplateNode node, String key) =>
    node.props?[key]?.toString() ?? '';

const Map<String, IconData> _icons = <String, IconData>{
  'home': Icons.home,
  'search': Icons.search,
  'settings': Icons.settings,
  'person': Icons.person,
  'star': Icons.star,
  'wallet': Icons.account_balance_wallet,
};

Widget _text(BuildContext context, TemplateNode node, List<Widget> children) =>
    Text(_str(node, 'value'));

Widget _button(BuildContext context, TemplateNode node, List<Widget> children) {
  final String label =
      node.props?['label']?.toString() ?? node.props?['text']?.toString() ?? '';
  return ElevatedButton(onPressed: () {}, child: Text(label));
}

Widget _icon(BuildContext context, TemplateNode node, List<Widget> children) =>
    Icon(_icons[_str(node, 'name')] ?? Icons.help_outline);

Widget _input(BuildContext context, TemplateNode node, List<Widget> children) {
  final String? placeholder = node.props?['placeholder']?.toString();
  return TextField(decoration: InputDecoration(hintText: placeholder));
}

Widget _row(BuildContext context, TemplateNode node, List<Widget> children) =>
    Row(mainAxisSize: MainAxisSize.min, children: children);

Widget _container(
  BuildContext context,
  TemplateNode node,
  List<Widget> children,
) =>
    Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );

/// Primitivos Core UI (F2.6).
final Map<String, SduiBuilder> coreComponents = <String, SduiBuilder>{
  'text': _text,
  'button': _button,
  'icon': _icon,
  'input': _input,
  'row': _row,
  'container': _container,
};

/// Registry padrão do catálogo — primitivos Core UI + família Cards (F6), com
/// fallback gracioso opcional. Famílias seguintes (Headers/Listas, especializados)
/// somam aqui em F7/F8.
SduiRegistry createDefaultRegistry(
        {void Function(String type)? onUnknownType}) =>
    SduiRegistry(<String, SduiBuilder>{
      ...coreComponents,
      ...cardComponents,
      ...headerComponents,
      ...listComponents,
    }, onUnknownType: onUnknownType);
