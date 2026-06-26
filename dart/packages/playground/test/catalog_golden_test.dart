@Tags(<String>['golden'])
library;

import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Suíte golden do catálogo (F10.3). Goldens são **sensíveis à plataforma**
/// (fontes/rasterização) — por isso ficam na tag `golden`, **excluída do CI**
/// (`flutter test --exclude-tags golden`, via melos). Rode localmente com:
///
/// ```sh
/// flutter test --tags golden --update-goldens   # gera/atualiza as baselines
/// flutter test --tags golden                     # compara
/// ```

const TemplateNode _catalogSample = TemplateNode(
  type: 'container',
  children: <TemplateNode>[
    TemplateNode(
      type: 'main-header',
      props: <String, Object?>{'title': 'Catálogo', 'subtitle': 'amostra'},
    ),
    TemplateNode(
      type: 'card-balance',
      props: <String, Object?>{'label': 'Saldo', 'amount': 'R\$ 1.234,50'},
    ),
    TemplateNode(
      type: 'invest-card',
      props: <String, Object?>{'title': 'Comece a investir', 'cta': 'Investir'},
    ),
    TemplateNode(
      type: 'empty-state',
      props: <String, Object?>{'title': 'Sem itens', 'message': 'Nada aqui'},
    ),
  ],
);

void main() {
  testWidgets('golden: amostra do catálogo', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: TemplateRenderer(
              template: _catalogSample,
              data: const <String, Object?>{},
            ),
          ),
        ),
      ),
    );
    await expectLater(
      find.byType(TemplateRenderer),
      matchesGoldenFile('goldens/catalog_sample.png'),
    );
  });
}
