// GERADO por dart/tool/generate_models.dart — não editar à mão.
// Fonte: packages/core/schema (JSON Schema do @yukilabs/agnostic-ui-core).
// ignore_for_file: type=lint

enum EnvelopeOrigin {
  app, sdk,
}

enum EnvelopeType {
  request, response, event, error,
}

class EnvelopeError {
  const EnvelopeError({
    required this.code,
    required this.message,
  });

  factory EnvelopeError.fromJson(Map<String, Object?> json) => EnvelopeError(
    code: json['code']! as String,
    message: json['message']! as String,
  );

  final String code;
  final String message;

  Map<String, Object?> toJson() => <String, Object?>{
    'code': code,
    'message': message,
  };
}

class EnvelopeMeta {
  const EnvelopeMeta({
    required this.bridgeVersion,
    required this.tenantId,
  });

  factory EnvelopeMeta.fromJson(Map<String, Object?> json) => EnvelopeMeta(
    bridgeVersion: json['bridgeVersion']! as String,
    tenantId: json['tenantId']! as String,
  );

  final String bridgeVersion;
  final String tenantId;

  Map<String, Object?> toJson() => <String, Object?>{
    'bridgeVersion': bridgeVersion,
    'tenantId': tenantId,
  };
}

class Envelope {
  const Envelope({
    required this.id,
    required this.origin,
    required this.type,
    this.method,
    this.params,
    this.result,
    this.error,
    required this.meta,
  });

  factory Envelope.fromJson(Map<String, Object?> json) => Envelope(
    id: json['id']! as String,
    origin: EnvelopeOrigin.values.byName(json['origin']! as String),
    type: EnvelopeType.values.byName(json['type']! as String),
    method: json['method'] == null ? null : json['method']! as String,
    params: json['params'] == null ? null : json['params']!,
    result: json['result'] == null ? null : json['result']!,
    error: json['error'] == null ? null : EnvelopeError.fromJson(json['error']! as Map<String, Object?>),
    meta: EnvelopeMeta.fromJson(json['meta']! as Map<String, Object?>),
  );

  final String id;
  final EnvelopeOrigin origin;
  final EnvelopeType type;
  final String? method;
  final Object? params;
  final Object? result;
  final EnvelopeError? error;
  final EnvelopeMeta meta;

  Map<String, Object?> toJson() => <String, Object?>{
    'id': id,
    'origin': origin.name,
    'type': type.name,
    if (method != null) 'method': method!,
    if (params != null) 'params': params!,
    if (result != null) 'result': result!,
    if (error != null) 'error': error!.toJson(),
    'meta': meta.toJson(),
  };
}

