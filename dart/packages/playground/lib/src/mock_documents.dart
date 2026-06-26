import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';

/// Documentos SDUI mock por perfil de sandbox — o playground simula o BFF
/// (F10). `happyPath`/`slow` rendem a home; `empty` cai no empty-state; `error`
/// traz uma `exception`.

const TemplateNode _homeRoot = TemplateNode(
  type: 'container',
  children: <TemplateNode>[
    TemplateNode(
      type: 'main-header',
      props: <String, Object?>{
        'title': 'Olá, {{ user.name }}',
        'subtitle': 'bem-vindo'
      },
    ),
    TemplateNode(
      type: 'card-balance',
      props: <String, Object?>{
        'label': 'Saldo disponível',
        'amount': '{{ balance.formatted }}'
      },
    ),
    TemplateNode(
        type: 'main-header', props: <String, Object?>{'title': 'Produtos'}),
    TemplateNode(
      type: 'product-list',
      children: <TemplateNode>[
        TemplateNode(
          type: 'product-card',
          dataBind: r'{{ products }}',
          props: <String, Object?>{
            'name': r'{{ $item.name }}',
            'price': r'{{ $item.price }}'
          },
        ),
      ],
    ),
    TemplateNode(
      type: 'invest-card',
      props: <String, Object?>{
        'title': 'Comece a investir',
        'cta': 'Investir',
        'action': <String, Object?>{'type': 'navigate', 'target': '/invest'},
      },
    ),
  ],
);

const Map<String, Object?> _homeContext = <String, Object?>{
  'user': <String, Object?>{'name': 'Ada'},
  'balance': <String, Object?>{'formatted': 'R\$ 1.234,50'},
  'products': <Object?>[
    <String, Object?>{'name': 'CDB', 'price': 'R\$ 100'},
    <String, Object?>{'name': 'Tesouro', 'price': 'R\$ 50'},
  ],
};

SduiDocument mockDocumentFor(MockProfile profile) {
  switch (profile) {
    case MockProfile.happyPath:
    case MockProfile.slow:
      return const SduiDocument(
        screenId: 'home',
        version: '1',
        root: _homeRoot,
        context: _homeContext,
        refresh: SduiRefresh(enabled: true),
      );
    case MockProfile.empty:
      return const SduiDocument(
        screenId: 'home',
        version: '1',
        root: TemplateNode(
          type: 'empty-state',
          props: <String, Object?>{
            'title': 'Nada por aqui',
            'message': 'Adicione um produto para começar',
          },
        ),
        context: <String, Object?>{},
      );
    case MockProfile.error:
      return const SduiDocument(
        screenId: 'home',
        version: '1',
        root: TemplateNode(type: 'text'),
        context: <String, Object?>{},
        exception: SduiException(message: 'Falha ao carregar (perfil error)'),
      );
  }
}
