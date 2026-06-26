/// Identidade do contrato SDUI espelhado neste pacote.
///
/// O `core` (TS/Zod) é a fonte da verdade; os modelos Dart são gerados a partir
/// do JSON Schema publicado por ele. Este metadado existe para o check de drift
/// (F1.5) ancorar a versão do contrato que o lado Dart espelha.
abstract final class ContractMeta {
  /// Nome dos artefatos de JSON Schema consumidos pelo codegen.
  static const List<String> schemaArtifacts = <String>[
    'template-node',
    'envelope',
    'tenant-config',
  ];
}
