import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'sdui_registry.dart';

/// Família **Listas** do catálogo (F7): arranjam os filhos já compostos (a
/// expansão por `dataBind` acontece antes, no resolveTemplate). Variam o
/// espaçamento/afordância (divisores, espaços, check de benefício).

List<Widget> _withDividers(List<Widget> children) {
  final List<Widget> out = <Widget>[];
  for (int i = 0; i < children.length; i += 1) {
    if (i > 0) out.add(const Divider(height: 1));
    out.add(children[i]);
  }
  return out;
}

List<Widget> _spaced(List<Widget> children) {
  final List<Widget> out = <Widget>[];
  for (int i = 0; i < children.length; i += 1) {
    if (i > 0) out.add(const SizedBox(height: 8));
    out.add(children[i]);
  }
  return out;
}

Widget _column(List<Widget> children) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );

Widget _list(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(_withDividers(ch));

Widget _productList(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(_spaced(ch));

Widget _benefitList(BuildContext c, TemplateNode n, List<Widget> ch) => _column(
      ch
          .map(
            (Widget child) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: <Widget>[
                  const Icon(Icons.check, color: Colors.green, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: child),
                ],
              ),
            ),
          )
          .toList(),
    );

Widget _performanceList(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(_withDividers(ch));

/// Builders da família Listas, registrados no registry padrão.
final Map<String, SduiBuilder> listComponents = <String, SduiBuilder>{
  'list': _list,
  'product-list': _productList,
  'benefit-list': _benefitList,
  'performance-list': _performanceList,
};
