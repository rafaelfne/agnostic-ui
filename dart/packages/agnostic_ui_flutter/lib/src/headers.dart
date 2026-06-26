import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:flutter/material.dart';

import 'sdui_registry.dart';

/// Família **Headers** do catálogo (F7): cabeçalhos de tela/produto/detalhe/
/// catálogo. Lêem props já resolvidas e compõem um título + apoio.

String _p(TemplateNode node, String key) => node.props?[key]?.toString() ?? '';

const TextStyle _title = TextStyle(fontSize: 22, fontWeight: FontWeight.w700);
const TextStyle _support = TextStyle(fontSize: 14, color: Colors.black54);

Widget _header(List<Widget> body) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: body,
      ),
    );

Widget _mainHeader(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _header(<Widget>[
      Text(_p(n, 'title'), style: _title),
      if (n.props?['subtitle'] != null)
        Text(_p(n, 'subtitle'), style: _support),
    ]);

Widget _productHeader(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _header(<Widget>[
      Text(_p(n, 'name'), style: _title),
      if (n.props?['price'] != null) Text(_p(n, 'price'), style: _support),
    ]);

Widget _productDetailsHeader(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _header(<Widget>[
      Text(_p(n, 'name'), style: _title),
      if (n.props?['description'] != null)
        Text(_p(n, 'description'), style: _support),
    ]);

Widget _catalogHeader(BuildContext c, TemplateNode n, List<Widget> ch) =>
    _header(<Widget>[
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(_p(n, 'title'), style: _title),
          if (n.props?['count'] != null) Text(_p(n, 'count'), style: _support),
        ],
      ),
    ]);

/// Builders da família Headers, registrados no registry padrão.
final Map<String, SduiBuilder> headerComponents = <String, SduiBuilder>{
  'main-header': _mainHeader,
  'product-header': _productHeader,
  'product-details-header': _productDetailsHeader,
  'catalog-header': _catalogHeader,
};
