import 'dart:convert';

import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';

/// Resposta HTTP crua (status + corpo) — abstrai o cliente HTTP concreto.
class SduiHttpResponse {
  const SduiHttpResponse({required this.statusCode, required this.body});
  final int statusCode;
  final String body;
}

/// Transporte HTTP **injetável**: o host pluga `http`/`dio`; os testes usam um
/// fake. Mantém o renderer sem acoplar um cliente HTTP (consistente com a bridge).
typedef SduiTransport = Future<SduiHttpResponse> Function(
    Uri url, Map<String, String> headers);

/// Cliente do documento SDUI (F5.3): busca o documento no BFF com o bearer token
/// e o `x-tenant-id`, parseia o `SduiDocument` e mapeia **erro HTTP → documento
/// de exceção** (a tela nunca quebra). Os perfis de mock (happyPath/empty/error/
/// slow) são resolvidos no BFF pelo token; o cliente só repassa o token.
class SduiClient {
  SduiClient({
    required this.baseUrl,
    required this.transport,
    required this.tenantId,
  });

  final Uri baseUrl;
  final SduiTransport transport;
  final String tenantId;

  Future<SduiDocument> fetchDocument(
    String screenId, {
    required String token,
  }) async {
    final Uri url = baseUrl.resolve('api/document/$screenId');
    final Map<String, String> headers = <String, String>{
      'authorization': 'Bearer $token',
      'x-tenant-id': tenantId,
      'accept': 'application/json',
    };

    final SduiHttpResponse response;
    try {
      response = await transport(url, headers);
    } catch (error) {
      return _exception(screenId, 'transport_error', 'falha de rede: $error');
    }

    if (response.statusCode == 200) {
      try {
        return SduiDocument.fromJson(
          jsonDecode(response.body) as Map<String, Object?>,
        );
      } catch (error) {
        return _exception(
            screenId, 'parse_error', 'documento inválido: $error');
      }
    }
    return _exception(
      screenId,
      'http_${response.statusCode}',
      _messageForStatus(response.statusCode),
    );
  }

  SduiDocument _exception(String screenId, String code, String message) =>
      SduiDocument(
        screenId: screenId,
        version: '0',
        root: const TemplateNode(type: 'exception-error'),
        context: const <String, Object?>{},
        exception: SduiException(code: code, message: message),
      );

  static String _messageForStatus(int status) {
    switch (status) {
      case 400:
        return 'requisição inválida';
      case 401:
        return 'não autenticado';
      case 403:
        return 'acesso negado';
      case 429:
        return 'limite de requisições atingido';
      default:
        return status >= 500 ? 'erro do servidor' : 'erro HTTP $status';
    }
  }
}
