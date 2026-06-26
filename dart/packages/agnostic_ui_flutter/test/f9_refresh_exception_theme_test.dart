import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget child) =>
    tester.pumpWidget(MaterialApp(home: Scaffold(body: child)));

void main() {
  group('theming (F9.3)', () {
    test('SduiTheme.fromTenant parseia hex; buildThemeData mapeia a cor', () {
      final SduiTheme theme = SduiTheme.fromTenant(const <String, Object?>{
        'primaryColor': '#FF0000',
      });
      expect(theme.primary, const Color(0xFFFF0000));
      expect(
          buildThemeData(theme).colorScheme.primary, const Color(0xFFFF0000));
    });
  });

  group('exception (F9.2)', () {
    testWidgets('documento com exception troca para o exception-error', (
      WidgetTester tester,
    ) async {
      const SduiDocument doc = SduiDocument(
        screenId: 'home',
        version: '1',
        root:
            TemplateNode(type: 'text', props: <String, Object?>{'value': 'x'}),
        context: <String, Object?>{},
        exception: SduiException(message: 'Indisponível'),
      );
      await _pump(tester, const SduiDocumentView(document: doc));
      expect(find.text('Indisponível'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
      expect(find.text('x'), findsNothing);
    });

    testWidgets('RequestResult{success:false} no context é detectado', (
      WidgetTester tester,
    ) async {
      const SduiDocument doc = SduiDocument(
        screenId: 'home',
        version: '1',
        root:
            TemplateNode(type: 'text', props: <String, Object?>{'value': 'oi'}),
        context: <String, Object?>{
          'balance': <String, Object?>{
            'success': false,
            'error': <String, Object?>{'message': 'falhou'},
          },
        },
      );
      await _pump(tester, const SduiDocumentView(document: doc));
      expect(find.text('falhou'), findsOneWidget);
    });
  });

  group('pull-to-refresh (F9.1)', () {
    testWidgets('refresh.enabled envolve num RefreshIndicator',
        (WidgetTester tester) async {
      const SduiDocument doc = SduiDocument(
        screenId: 'home',
        version: '1',
        root: TemplateNode(
            type: 'text', props: <String, Object?>{'value': 'conteúdo'}),
        context: <String, Object?>{},
        refresh: SduiRefresh(enabled: true),
      );
      await _pump(
        tester,
        SduiDocumentView(document: doc, onRefresh: () async {}),
      );
      expect(find.byType(RefreshIndicator), findsOneWidget);
      expect(find.text('conteúdo'), findsOneWidget);
    });
  });

  group('overlay por tenant (F9.4)', () {
    test('withOverrides adiciona partnerco-* sem tocar a base', () {
      final SduiRegistry registry =
          createDefaultRegistry().withOverrides(partnercoOverlay);
      expect(registry.contains('partnerco-balance-card'), isTrue);
      expect(registry.contains('partnerco-quick-actions'), isTrue);
      expect(registry.contains('text'), isTrue);
    });

    testWidgets('partnerco-balance-card pinta o Card com o tema do tenant', (
      WidgetTester tester,
    ) async {
      await _pump(
        tester,
        TemplateRenderer(
          registry: createDefaultRegistry().withOverrides(partnercoOverlay),
          theme: SduiTheme.fromTenant(
              const <String, Object?>{'primaryColor': '#112233'}),
          template: const TemplateNode(
            type: 'partnerco-balance-card',
            props: <String, Object?>{'label': 'Saldo', 'amount': 'R\$ 10'},
          ),
          data: const <String, Object?>{},
        ),
      );
      expect(find.text('Saldo'), findsOneWidget);
      expect(find.text('R\$ 10'), findsOneWidget);
      expect(tester.widget<Card>(find.byType(Card)).color,
          const Color(0xFF112233));
    });
  });
}
