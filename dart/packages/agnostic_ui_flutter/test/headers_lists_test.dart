import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(
  WidgetTester tester,
  TemplateNode template, [
  Map<String, Object?> data = const <String, Object?>{},
]) =>
    tester.pumpWidget(
      MaterialApp(
          home:
              Scaffold(body: TemplateRenderer(template: template, data: data))),
    );

void main() {
  group('família Headers + Listas (F7)', () {
    test('os 8 tipos entram no registry padrão', () {
      final SduiRegistry registry = createDefaultRegistry();
      for (final String type in <String>[
        'main-header',
        'product-header',
        'product-details-header',
        'catalog-header',
        'list',
        'product-list',
        'benefit-list',
        'performance-list',
      ]) {
        expect(registry.contains(type), isTrue, reason: type);
      }
    });

    testWidgets('main-header mostra title + subtitle com binding',
        (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'main-header',
          props: <String, Object?>{'title': '{{ t }}', 'subtitle': 'bem-vindo'},
        ),
        const <String, Object?>{'t': 'Olá, Ada'},
      );
      expect(find.text('Olá, Ada'), findsOneWidget);
      expect(find.text('bem-vindo'), findsOneWidget);
    });

    testWidgets('product-list arranja os filhos expandidos por dataBind', (
      WidgetTester tester,
    ) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'product-list',
          children: <TemplateNode>[
            TemplateNode(
              type: 'text',
              dataBind: r'{{ items }}',
              props: <String, Object?>{'value': r'{{ $item }}'},
            ),
          ],
        ),
        const <String, Object?>{
          'items': <Object?>['A', 'B', 'C'],
        },
      );
      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
      expect(find.text('C'), findsOneWidget);
    });

    testWidgets('benefit-list prefixa cada item com um check',
        (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'benefit-list',
          children: <TemplateNode>[
            TemplateNode(
                type: 'text', props: <String, Object?>{'value': 'Sem taxa'}),
            TemplateNode(
                type: 'text',
                props: <String, Object?>{'value': 'Resgate rápido'}),
          ],
        ),
      );
      expect(find.text('Sem taxa'), findsOneWidget);
      expect(find.text('Resgate rápido'), findsOneWidget);
      expect(find.byIcon(Icons.check), findsNWidgets(2));
    });
  });
}
