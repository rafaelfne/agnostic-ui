import '../generated/template_node.dart';

// Espelho Dart do documento SDUI do core (schemas/document.ts) — o modelo adiado
// em F1.A.4, agora consumido pelo SduiClient (F5). Hand-written (o gerador Dart
// ainda não resolve o TemplateNode compartilhado entre schemas).

/// Metadado de pull-to-refresh do documento (manual §10).
class SduiRefresh {
  const SduiRefresh({required this.enabled});
  final bool enabled;

  factory SduiRefresh.fromJson(Map<String, Object?> json) =>
      SduiRefresh(enabled: json['enabled']! as bool);

  Map<String, Object?> toJson() => <String, Object?>{'enabled': enabled};
}

/// Erro exposto ao renderer, que troca para o template de exceção.
class SduiException {
  const SduiException({this.code, required this.message});
  final String? code;
  final String message;

  factory SduiException.fromJson(Map<String, Object?> json) => SduiException(
        code: json['code'] as String?,
        message: json['message']! as String,
      );

  Map<String, Object?> toJson() => <String, Object?>{
        if (code != null) 'code': code,
        'message': message,
      };
}

/// Documento SDUI de runtime que o BFF emite e o renderer nativo consome
/// (ADR 0005 §5): o `root` (template ainda bindável) + o `context` (dados); o
/// renderer resolve `{{ ... }}` de `root` contra `context`.
class SduiDocument {
  const SduiDocument({
    required this.screenId,
    required this.version,
    required this.root,
    required this.context,
    this.refresh,
    this.exception,
  });

  final String screenId;
  final String version;
  final TemplateNode root;
  final Map<String, Object?> context;
  final SduiRefresh? refresh;
  final SduiException? exception;

  factory SduiDocument.fromJson(Map<String, Object?> json) => SduiDocument(
        screenId: json['screenId']! as String,
        version: json['version']! as String,
        root: TemplateNode.fromJson(json['root']! as Map<String, Object?>),
        context: (json['context']! as Map).cast<String, Object?>(),
        refresh: json['refresh'] == null
            ? null
            : SduiRefresh.fromJson(json['refresh']! as Map<String, Object?>),
        exception: json['exception'] == null
            ? null
            : SduiException.fromJson(
                json['exception']! as Map<String, Object?>),
      );

  Map<String, Object?> toJson() => <String, Object?>{
        'screenId': screenId,
        'version': version,
        'root': root.toJson(),
        'context': context,
        if (refresh != null) 'refresh': refresh!.toJson(),
        if (exception != null) 'exception': exception!.toJson(),
      };
}
