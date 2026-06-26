import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:agnostic_ui_playground/agnostic_ui_playground.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Playground E2E por perfil (F10.2)', () {
    testWidgets('happyPath: home com header, saldo e produtos', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
          const MaterialApp(home: PlaygroundHome(tenant: 'partnerco')));
      expect(find.text('Olá, Ada'), findsOneWidget);
      expect(find.text('R\$ 1.234,50'), findsOneWidget);
      expect(find.text('CDB'), findsOneWidget);
      expect(find.text('Tesouro'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Investir'), findsOneWidget);
    });

    testWidgets('empty: troca para o empty-state', (WidgetTester tester) async {
      await tester.pumpWidget(
          const MaterialApp(home: PlaygroundHome(tenant: 'partnerco')));
      await tester.tap(find.widgetWithText(ChoiceChip, 'empty'));
      await tester.pumpAndSettle();
      expect(find.text('Nada por aqui'), findsOneWidget);
      expect(find.text('CDB'), findsNothing);
    });

    testWidgets('error: troca para o exception-error',
        (WidgetTester tester) async {
      await tester.pumpWidget(
          const MaterialApp(home: PlaygroundHome(tenant: 'partnerco')));
      await tester.tap(find.widgetWithText(ChoiceChip, 'error'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Falha ao carregar'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('slow: rende a home (mesmo do happyPath)',
        (WidgetTester tester) async {
      await tester.pumpWidget(
          const MaterialApp(home: PlaygroundHome(tenant: 'partnerco')));
      await tester.tap(find.widgetWithText(ChoiceChip, 'slow'));
      await tester.pumpAndSettle();
      expect(find.text('Olá, Ada'), findsOneWidget);
    });

    test('o marker resolve o documento por perfil', () {
      expect(mockDocumentFor(MockProfile.error).exception, isNotNull);
      expect(mockDocumentFor(MockProfile.empty).root.type, 'empty-state');
      expect(mockDocumentFor(MockProfile.happyPath).root.type, 'container');
    });
  });
}
