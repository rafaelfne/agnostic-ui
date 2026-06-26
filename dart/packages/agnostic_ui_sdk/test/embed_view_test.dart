import 'package:agnostic_ui_sdk/agnostic_ui_sdk.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget child) =>
    tester.pumpWidget(MaterialApp(home: Scaffold(body: child)));

void main() {
  testWidgets('renderMode.native monta o renderer com binding (F3.5)', (
    WidgetTester tester,
  ) async {
    await _pump(
      tester,
      const EmbedView(
        token: 'app_sandbox_acme_happyPath',
        tenant: 'acme',
        renderMode: RenderMode.native,
        template: TemplateNode(
          type: 'text',
          props: <String, Object?>{'value': 'Olá, {{ name }}'},
        ),
        data: <String, Object?>{'name': 'Ada'},
      ),
    );
    expect(find.text('Olá, Ada'), findsOneWidget);
  });

  testWidgets('renderMode.webview delega ao webViewBuilder do host', (
    WidgetTester tester,
  ) async {
    await _pump(
      tester,
      EmbedView(
        token: 'jwt-token',
        tenant: 'acme',
        webViewBuilder: (BuildContext context, String token) =>
            Text('webview:$token'),
      ),
    );
    expect(find.text('webview:jwt-token'), findsOneWidget);
  });
}
