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
  group('família Cards (F6)', () {
    test('os 8 tipos de card entram no registry padrão', () {
      final SduiRegistry registry = createDefaultRegistry();
      for (final String type in <String>[
        'card-balance',
        'category-card',
        'product-card',
        'portfolio-card',
        'catalog-card',
        'information-card',
        'invest-card',
        'product-performance-card',
      ]) {
        expect(registry.contains(type), isTrue, reason: type);
      }
    });

    testWidgets('card-balance mostra label + amount com binding',
        (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'card-balance',
          props: <String, Object?>{'label': 'Saldo', 'amount': '{{ balance }}'},
        ),
        const <String, Object?>{'balance': '1.234,50'},
      );
      expect(find.text('Saldo'), findsOneWidget);
      expect(find.text('1.234,50'), findsOneWidget);
      expect(find.byType(Card), findsOneWidget);
    });

    testWidgets('product-card mostra name/description/price',
        (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'product-card',
          props: <String, Object?>{
            'name': '{{ p.name }}',
            'description': 'Renda fixa',
            'price': 'R\$ 50',
          },
        ),
        const <String, Object?>{
          'p': <String, Object?>{'name': 'CDB'},
        },
      );
      expect(find.text('CDB'), findsOneWidget);
      expect(find.text('Renda fixa'), findsOneWidget);
      expect(find.text('R\$ 50'), findsOneWidget);
    });

    testWidgets('invest-card renderiza um cta (botão)',
        (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'invest-card',
          props: <String, Object?>{
            'title': 'Comece a investir',
            'cta': 'Quero investir'
          },
        ),
      );
      expect(find.text('Comece a investir'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Quero investir'),
          findsOneWidget);
    });

    testWidgets('product-performance-card mostra seta conforme o sinal', (
      WidgetTester tester,
    ) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'product-performance-card',
          props: <String, Object?>{'name': 'Fundo X', 'performance': '-2,3%'},
        ),
      );
      expect(find.text('-2,3%'), findsOneWidget);
      expect(find.byIcon(Icons.arrow_downward), findsOneWidget);
    });
  });
}
