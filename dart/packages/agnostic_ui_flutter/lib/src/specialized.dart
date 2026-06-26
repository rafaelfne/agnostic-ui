import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'sdui_registry.dart';
import 'sdui_scope.dart';

/// Família **Especializados** do catálogo (F8): window, tabs, empty-state,
/// my-wallets-content, invest-amount, invest-review, portfolio-builder-catalog.
/// Componentes com estado (tabs/input) e/ou que despacham ações (invest-review)
/// via o [SduiScope] (F4).

String _p(TemplateNode node, String key) => node.props?[key]?.toString() ?? '';

const TextStyle _bold = TextStyle(fontSize: 16, fontWeight: FontWeight.w600);
const TextStyle _muted = TextStyle(fontSize: 13, color: Colors.black54);

Widget _column(List<Widget> children,
        {CrossAxisAlignment cross = CrossAxisAlignment.stretch}) =>
    Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: cross,
        children: children);

Widget _window(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(<Widget>[
      if (n.props?['title'] != null)
        Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_p(n, 'title'), style: _bold)),
      ...ch,
    ]);

Widget _emptyState(BuildContext c, TemplateNode n, List<Widget> ch) => Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.inbox_outlined, size: 48, color: Colors.black38),
            const SizedBox(height: 12),
            Text(_p(n, 'title'), style: _bold),
            if (n.props?['message'] != null)
              Text(_p(n, 'message'),
                  style: _muted, textAlign: TextAlign.center),
          ],
        ),
      ),
    );

Widget _myWalletsContent(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(<Widget>[
      Text(_p(n, 'title').isEmpty ? 'Minhas carteiras' : _p(n, 'title'),
          style: _bold),
      const SizedBox(height: 8),
      ...ch,
    ]);

Widget _investAmount(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(
      cross: CrossAxisAlignment.start,
      <Widget>[
        if (n.props?['label'] != null) Text(_p(n, 'label'), style: _muted),
        TextField(
          keyboardType: TextInputType.number,
          controller: TextEditingController(text: _p(n, 'value')),
          decoration: const InputDecoration(prefixText: 'R\$ '),
        ),
      ],
    );

Widget _investReview(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _column(<Widget>[
      if (n.props?['title'] != null)
        Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_p(n, 'title'), style: _bold)),
      ...ch,
      const SizedBox(height: 12),
      ElevatedButton(
        onPressed: nodeActionHandler(c, n),
        child: Text(_p(n, 'cta').isEmpty ? 'Confirmar' : _p(n, 'cta')),
      ),
    ]);

Widget _portfolioBuilderCatalog(
        BuildContext c, TemplateNode n, List<Widget> ch) =>
    Wrap(spacing: 8, runSpacing: 8, children: ch);

class _Tabs extends StatefulWidget {
  const _Tabs({required this.labels, required this.contents});
  final List<String> labels;
  final List<Widget> contents;

  @override
  State<_Tabs> createState() => _TabsState();
}

class _TabsState extends State<_Tabs> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            for (int i = 0; i < widget.labels.length; i += 1)
              Expanded(
                child: TextButton(
                  onPressed: () => setState(() => _index = i),
                  style: TextButton.styleFrom(
                    foregroundColor: i == _index ? Colors.blue : Colors.black54,
                  ),
                  child: Text(widget.labels[i]),
                ),
              ),
          ],
        ),
        if (_index < widget.contents.length) widget.contents[_index],
      ],
    );
  }
}

Widget _tabs(BuildContext c, TemplateNode n, List<Widget> ch) {
  final Object? rawLabels = n.props?['tabs'];
  final List<String> labels = rawLabels is List
      ? rawLabels.map((Object? e) => e.toString()).toList()
      : <String>[];
  return _Tabs(labels: labels, contents: ch);
}

/// Builders da família Especializados, registrados no registry padrão.
final Map<String, SduiBuilder> specializedComponents = <String, SduiBuilder>{
  'window': _window,
  'tabs': _tabs,
  'empty-state': _emptyState,
  'my-wallets-content': _myWalletsContent,
  'invest-amount': _investAmount,
  'invest-review': _investReview,
  'portfolio-builder-catalog': _portfolioBuilderCatalog,
};
