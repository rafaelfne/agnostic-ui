import 'dart:convert';

import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

String _doc(
        {Map<String, Object?> context = const <String, Object?>{
          'name': 'Ada'
        }}) =>
    jsonEncode(<String, Object?>{
      'screenId': 'home',
      'version': '1',
      'root': <String, Object?>{
        'type': 'text',
        'props': <String, Object?>{'value': '{{ name }}'},
      },
      'context': context,
    });

SduiClient _clientReturning(
        SduiHttpResponse Function(Map<String, String>) respond) =>
    SduiClient(
      baseUrl: Uri.parse('https://bff.example/'),
      tenantId: 'acme',
      transport: (Uri url, Map<String, String> headers) async =>
          respond(headers),
    );

void main() {
  group('SduiClient (F5.3/F5.4)', () {
    test('200 → parseia o SduiDocument (root bindável + context)', () async {
      final SduiClient client = _clientReturning(
        (_) => SduiHttpResponse(statusCode: 200, body: _doc()),
      );
      final SduiDocument doc = await client.fetchDocument('home', token: 't');
      expect(doc.screenId, 'home');
      expect(doc.exception, isNull);
      expect(doc.root.type, 'text');
      expect(doc.context['name'], 'Ada');
    });

    test('envia bearer + x-tenant-id', () async {
      Map<String, String>? captured;
      final SduiClient client = _clientReturning((Map<String, String> headers) {
        captured = headers;
        return SduiHttpResponse(statusCode: 200, body: _doc());
      });
      await client.fetchDocument('home', token: 'app_sandbox_acme_happyPath');
      expect(captured?['authorization'], 'Bearer app_sandbox_acme_happyPath');
      expect(captured?['x-tenant-id'], 'acme');
    });

    test('erro HTTP → documento de exceção (400/401/403/429)', () async {
      for (final int status in <int>[400, 401, 403, 429]) {
        final SduiClient client = _clientReturning(
          (_) => SduiHttpResponse(statusCode: status, body: ''),
        );
        final SduiDocument doc = await client.fetchDocument('home', token: 't');
        expect(doc.exception, isNotNull, reason: 'status $status');
        expect(doc.exception!.code, 'http_$status');
        expect(doc.root.type, 'exception-error');
      }
    });

    test('perfis de mock: happyPath/empty (200) vs error (5xx → exceção)',
        () async {
      final SduiClient happy = _clientReturning(
        (_) => SduiHttpResponse(statusCode: 200, body: _doc()),
      );
      final SduiClient empty = _clientReturning(
        (_) => SduiHttpResponse(
          statusCode: 200,
          body: _doc(context: const <String, Object?>{}),
        ),
      );
      final SduiClient error = _clientReturning(
        (_) => SduiHttpResponse(statusCode: 500, body: 'boom'),
      );

      expect((await happy.fetchDocument('home', token: 't')).context['name'],
          'Ada');
      expect((await empty.fetchDocument('home', token: 't')).context, isEmpty);
      expect((await error.fetchDocument('home', token: 't')).exception?.code,
          'http_500');
    });

    test('corpo inválido → exceção de parse (tela não quebra)', () async {
      final SduiClient client = _clientReturning(
        (_) => const SduiHttpResponse(statusCode: 200, body: 'not json'),
      );
      final SduiDocument doc = await client.fetchDocument('home', token: 't');
      expect(doc.exception?.code, 'parse_error');
    });
  });
}
