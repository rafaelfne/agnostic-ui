import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeNav implements NavigationDelegate {
  final List<String> calls = <String>[];
  @override
  void navigate(String target) => calls.add('navigate:$target');
  @override
  void navigateFlow(String target) => calls.add('navigateFlow:$target');
  @override
  void replaceCurrent(String target) => calls.add('replaceCurrent:$target');
  @override
  void back() => calls.add('back');
  @override
  void refreshHomePage() => calls.add('refreshHomePage');
}

Future<void> _pump(
  WidgetTester tester,
  TemplateNode template, {
  NativeDispatcher? dispatcher,
}) =>
    tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TemplateRenderer(
            template: template,
            data: const <String, Object?>{},
            dispatcher: dispatcher,
          ),
        ),
      ),
    );

void main() {
  group('família Especializados (F8)', () {
    test('os 7 tipos entram no registry padrão', () {
      final SduiRegistry registry = createDefaultRegistry();
      for (final String type in <String>[
        'window',
        'tabs',
        'empty-state',
        'my-wallets-content',
        'invest-amount',
        'invest-review',
        'portfolio-builder-catalog',
      ]) {
        expect(registry.contains(type), isTrue, reason: type);
      }
    });

    testWidgets('empty-state mostra título, mensagem e ícone',
        (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'empty-state',
          props: <String, Object?>{'title': 'Vazio', 'message': 'Nada aqui'},
        ),
      );
      expect(find.text('Vazio'), findsOneWidget);
      expect(find.text('Nada aqui'), findsOneWidget);
      expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
    });

    testWidgets('tabs alterna o conteúdo exibido', (WidgetTester tester) async {
      await _pump(
        tester,
        const TemplateNode(
          type: 'tabs',
          props: <String, Object?>{
            'tabs': <Object?>['Um', 'Dois'],
          },
          children: <TemplateNode>[
            TemplateNode(
                type: 'text', props: <String, Object?>{'value': 'conteúdo um'}),
            TemplateNode(
                type: 'text',
                props: <String, Object?>{'value': 'conteúdo dois'}),
          ],
        ),
      );
      expect(find.text('conteúdo um'), findsOneWidget);
      expect(find.text('conteúdo dois'), findsNothing);
      await tester.tap(find.text('Dois'));
      await tester.pump();
      expect(find.text('conteúdo dois'), findsOneWidget);
    });

    testWidgets('button despacha a ação via dispatcher do escopo (F4⇄F8)', (
      WidgetTester tester,
    ) async {
      final _FakeNav nav = _FakeNav();
      await _pump(
        tester,
        const TemplateNode(
          type: 'button',
          props: <String, Object?>{
            'label': 'Ir',
            'action': <String, Object?>{
              'type': 'navigate',
              'target': '/invest'
            },
          },
        ),
        dispatcher: NativeDispatcher(navigation: nav),
      );
      await tester.tap(find.text('Ir'));
      await tester.pump();
      expect(nav.calls, <String>['navigate:/invest']);
    });

    testWidgets('invest-review confirma despachando a ação',
        (WidgetTester tester) async {
      final _FakeNav nav = _FakeNav();
      await _pump(
        tester,
        const TemplateNode(
          type: 'invest-review',
          props: <String, Object?>{
            'title': 'Revise',
            'cta': 'Confirmar',
            'action': <String, Object?>{'type': 'navigate', 'target': '/done'},
          },
        ),
        dispatcher: NativeDispatcher(navigation: nav),
      );
      await tester.tap(find.text('Confirmar'));
      await tester.pump();
      expect(nav.calls, <String>['navigate:/done']);
    });
  });
}
