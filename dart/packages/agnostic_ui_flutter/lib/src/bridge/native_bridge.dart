import 'dart:async';

import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';

/// Manipula um envelope de método in-process, retornando o resultado.
typedef MethodHandler = Future<Object?> Function(Object? params);

/// Bridge nativa: **mesmo contrato `Envelope` do core, transporte in-process**
/// (sem WebView, sem `postMessage`) — ADR 0005 §4. Despacha métodos
/// (request → response/error) para handlers Dart e expõe os eventos nativos como
/// `Stream<Envelope>`. A correlação por UUID some no nativo (chamada direta): o
/// envelope de resposta reusa o `id` do request.
class NativeBridge {
  NativeBridge({
    required Map<String, MethodHandler> handlers,
    required this.tenantId,
    this.bridgeVersion = '1',
  }) : _handlers = Map<String, MethodHandler>.unmodifiable(handlers);

  final Map<String, MethodHandler> _handlers;
  final String tenantId;
  final String bridgeVersion;
  final StreamController<Envelope> _events =
      StreamController<Envelope>.broadcast();

  /// Eventos nativos → renderer (`tokenReady`, `themeChanged`, …).
  Stream<Envelope> get events => _events.stream;

  EnvelopeMeta get _meta =>
      EnvelopeMeta(bridgeVersion: bridgeVersion, tenantId: tenantId);

  bool handles(String method) => _handlers.containsKey(method);

  /// Despacha um envelope de request ao handler do seu `method`.
  Future<Envelope> send(Envelope request) async {
    final MethodHandler? handler = _handlers[request.method];
    if (handler == null) {
      return _error(
          request, 'method_not_found', 'no handler for ${request.method}');
    }
    try {
      final Object? result = await handler(request.params);
      return Envelope(
        id: request.id,
        origin: EnvelopeOrigin.sdk,
        type: EnvelopeType.response,
        method: request.method,
        result: result,
        meta: request.meta,
      );
    } catch (error) {
      return _error(request, 'handler_error', error.toString());
    }
  }

  Envelope _error(Envelope request, String code, String message) => Envelope(
        id: request.id,
        origin: EnvelopeOrigin.sdk,
        type: EnvelopeType.error,
        method: request.method,
        error: EnvelopeError(code: code, message: message),
        meta: request.meta,
      );

  /// O host nativo empurra um evento para o renderer.
  void emitEvent(String event, [Object? payload]) {
    _events.add(
      Envelope(
        id: event,
        origin: EnvelopeOrigin.app,
        type: EnvelopeType.event,
        method: event,
        params: payload,
        meta: _meta,
      ),
    );
  }

  Future<void> dispose() => _events.close();
}
