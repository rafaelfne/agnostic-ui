import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget child) =>
    tester.pumpWidget(MaterialApp(home: Scaffold(body: child)));

void main() {
  testWidgets('home: binding ponta a ponta nos primitivos Core UI (F2.7)', (
    WidgetTester tester,
  ) async {
    const TemplateNode template = TemplateNode(
      type: 'container',
      children: <TemplateNode>[
        TemplateNode(
          type: 'text',
          props: <String, Object?>{'value': 'Olá, {{ user.name }}'},
        ),
        TemplateNode(
          type: 'row',
          children: <TemplateNode>[
            TemplateNode(
                type: 'icon', props: <String, Object?>{'name': 'star'}),
            TemplateNode(
              type: 'text',
              props: <String, Object?>{'value': 'Saldo: {{ balance }}'},
            ),
          ],
        ),
        TemplateNode(
            type: 'button', props: <String, Object?>{'label': 'Investir'}),
        TemplateNode(
            type: 'input', props: <String, Object?>{'placeholder': 'Buscar'}),
      ],
    );

    await _pump(
      tester,
      const TemplateRenderer(
        template: template,
        data: <String, Object?>{
          'user': <String, Object?>{'name': 'Ada'},
          'balance': 100,
        },
      ),
    );

    expect(find.text('Olá, Ada'), findsOneWidget);
    expect(find.text('Saldo: 100'), findsOneWidget);
    expect(find.text('Investir'), findsOneWidget);
    expect(find.byIcon(Icons.star), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('tipo desconhecido → fallback gracioso + telemetria (F2.5)', (
    WidgetTester tester,
  ) async {
    final List<String> seen = <String>[];
    const TemplateNode template = TemplateNode(
      type: 'container',
      children: <TemplateNode>[
        TemplateNode(type: 'mystery-widget'),
        TemplateNode(
            type: 'text', props: <String, Object?>{'value': 'visível'}),
      ],
    );

    await _pump(
      tester,
      TemplateRenderer(
        template: template,
        data: const <String, Object?>{},
        registry: createDefaultRegistry(onUnknownType: seen.add),
      ),
    );

    expect(find.text('visível'), findsOneWidget);
    expect(seen, contains('mystery-widget'));
  });

  testWidgets('dataBind expande filhos no render (F2.3)', (
    WidgetTester tester,
  ) async {
    const TemplateNode template = TemplateNode(
      type: 'container',
      children: <TemplateNode>[
        TemplateNode(
          type: 'text',
          dataBind: r'{{ items }}',
          props: <String, Object?>{'value': r'{{ $item }}'},
        ),
      ],
    );

    await _pump(
      tester,
      const TemplateRenderer(
        template: template,
        data: <String, Object?>{
          'items': <Object?>['a', 'b', 'c'],
        },
      ),
    );

    expect(find.text('a'), findsOneWidget);
    expect(find.text('b'), findsOneWidget);
    expect(find.text('c'), findsOneWidget);
  });
}
