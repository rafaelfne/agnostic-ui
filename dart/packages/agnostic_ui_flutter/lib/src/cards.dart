import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'sdui_registry.dart';

/// Família **Cards** do catálogo (F6). Cada builder lê as props já resolvidas
/// (binding aplicado no resolveTemplate) e compõe um cartão Material. Contratos
/// de props mínimos, co-evoluindo com o documento SDUI; reagem ao Dispatcher
/// (cta) quando houver. A regressão visual (golden) entra na suíte de F10.

String _p(TemplateNode node, String key) => node.props?[key]?.toString() ?? '';

const TextStyle _muted = TextStyle(fontSize: 12, color: Colors.black54);
const TextStyle _bold = TextStyle(fontSize: 16, fontWeight: FontWeight.w600);
const TextStyle _amount = TextStyle(fontSize: 24, fontWeight: FontWeight.w700);

const Map<String, IconData> _icons = <String, IconData>{
  'wallet': Icons.account_balance_wallet,
  'invest': Icons.trending_up,
  'card': Icons.credit_card,
  'savings': Icons.savings,
  'category': Icons.category,
};

Widget _card(List<Widget> body) => Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: body,
        ),
      ),
    );

Widget _cardBalance(BuildContext c, TemplateNode n, List<Widget> ch) => _card(
      <Widget>[
        Text(_p(n, 'label'), style: _muted),
        Text(_p(n, 'amount'), style: _amount)
      ],
    );

Widget _categoryCard(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Row(
        children: <Widget>[
          Icon(_icons[_p(n, 'icon')] ?? Icons.category),
          const SizedBox(width: 8),
          Text(_p(n, 'title'), style: _bold),
        ],
      ),
    ]);

Widget _productCard(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Text(_p(n, 'name'), style: _bold),
      if (n.props?['description'] != null)
        Text(_p(n, 'description'), style: _muted),
      if (n.props?['price'] != null) Text(_p(n, 'price'), style: _amount),
    ]);

Widget _portfolioCard(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Text(_p(n, 'name'), style: _bold),
      Text(_p(n, 'value'), style: _amount),
      if (n.props?['change'] != null) Text(_p(n, 'change'), style: _muted),
    ]);

Widget _catalogCard(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Text(_p(n, 'title'), style: _bold),
      if (n.props?['subtitle'] != null) Text(_p(n, 'subtitle'), style: _muted),
    ]);

Widget _informationCard(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Text(_p(n, 'title'), style: _bold),
      const SizedBox(height: 4),
      Text(_p(n, 'body')),
    ]);

Widget _investCard(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Text(_p(n, 'title'), style: _bold),
      if (n.props?['subtitle'] != null) Text(_p(n, 'subtitle'), style: _muted),
      const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerRight,
        child: ElevatedButton(
            onPressed: () {},
            child: Text(_p(n, 'cta').isEmpty ? 'Investir' : _p(n, 'cta'))),
      ),
    ]);

Widget _productPerformanceCard(
        BuildContext c, TemplateNode n, List<Widget> ch) =>
    _card(<Widget>[
      Text(_p(n, 'name'), style: _bold),
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(_p(n, 'performance'), style: _amount),
          Icon(
            _p(n, 'performance').startsWith('-')
                ? Icons.arrow_downward
                : Icons.arrow_upward,
            color: _p(n, 'performance').startsWith('-')
                ? Colors.red
                : Colors.green,
          ),
        ],
      ),
    ]);

/// Builders da família Cards, registrados no registry padrão.
final Map<String, SduiBuilder> cardComponents = <String, SduiBuilder>{
  'card-balance': _cardBalance,
  'category-card': _categoryCard,
  'product-card': _productCard,
  'portfolio-card': _portfolioCard,
  'catalog-card': _catalogCard,
  'information-card': _informationCard,
  'invest-card': _investCard,
  'product-performance-card': _productPerformanceCard,
};
