import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

const EnvelopeMeta _meta = EnvelopeMeta(bridgeVersion: '1', tenantId: 'acme');

Envelope _req(String method, [Object? params]) => Envelope(
      id: 'req-1',
      origin: EnvelopeOrigin.app,
      type: EnvelopeType.request,
      method: method,
      params: params,
      meta: _meta,
    );

void main() {
  group('NativeBridge (F3.6, transporte fake)', () {
    test('despacha request → response reusando o id', () async {
      final NativeBridge bridge = NativeBridge(
        tenantId: 'acme',
        handlers: <String, MethodHandler>{
          'echo': (Object? params) async => params,
        },
      );
      final Envelope res =
          await bridge.send(_req('echo', <String, Object?>{'a': 1}));
      expect(res.id, 'req-1');
      expect(res.origin, EnvelopeOrigin.sdk);
      expect(res.type, EnvelopeType.response);
      expect(res.result, <String, Object?>{'a': 1});
      await bridge.dispose();
    });

    test('handler que lança → envelope de erro; método ausente → error',
        () async {
      final NativeBridge bridge = NativeBridge(
        tenantId: 'acme',
        handlers: <String, MethodHandler>{
          'boom': (Object? params) async => throw StateError('x'),
        },
      );
      final Envelope boom = await bridge.send(_req('boom'));
      expect(boom.type, EnvelopeType.error);
      expect(boom.error?.code, 'handler_error');

      final Envelope unknown = await bridge.send(_req('nope'));
      expect(unknown.type, EnvelopeType.error);
      expect(unknown.error?.code, 'method_not_found');
      await bridge.dispose();
    });

    test('eventos nativos chegam pelo stream com o contrato Envelope', () {
      final NativeBridge bridge = NativeBridge(
        tenantId: 'acme',
        handlers: const <String, MethodHandler>{},
      );
      expectLater(
        bridge.events,
        emits(
          isA<Envelope>()
              .having((Envelope e) => e.type, 'type', EnvelopeType.event)
              .having(
                  (Envelope e) => e.method, 'method', BridgeEvents.tokenReady),
        ),
      );
      bridge
          .emitEvent(BridgeEvents.tokenReady, <String, Object?>{'token': 't'});
    });

    test('envelope faz round-trip fromJson/toJson', () {
      final Envelope original =
          _req('haptics', <String, Object?>{'type': 'light'});
      final Envelope restored = Envelope.fromJson(original.toJson());
      expect(restored.method, 'haptics');
      expect(restored.params, <String, Object?>{'type': 'light'});
      expect(restored.origin, EnvelopeOrigin.app);
    });

    test('defaultBridgeHandlers expõe haptics/closeWebView + injetados', () {
      final Map<String, MethodHandler> handlers = defaultBridgeHandlers(
        getEnvInfo: (Object? p) async => <String, Object?>{'platform': 'ios'},
      );
      expect(handlers.keys,
          containsAll(<String>['haptics', 'closeWebView', 'getEnvInfo']));
      expect(handlers.containsKey('openNativeShare'), isFalse);
    });
  });
}
