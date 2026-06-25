// Gera os modelos Dart de contrato (`agnostic_ui_contract`) a partir do JSON
// Schema publicado pelo `core` (`packages/core/schema/*.schema.json`, ADR 0005
// §2). É um gerador próprio (sem build_runner/quicktype), espelhando a filosofia
// `gen:di`/`gen:schema` do repo: saída versionada + modo `--check` de drift.
//
//   dart run tool/generate_models.dart          # escreve lib/src/generated/*
//   dart run tool/generate_models.dart --check   # falha (exit 1) se desatualizado
//
// Rode a partir de `dart/`. Os modelos são gerados; não editar à mão. Refletem o
// JSON Schema corrente — regenere o schema (`pnpm --filter ...-core gen:schema`)
// antes, se os schemas Zod do core mudarem.
import 'dart:convert';
import 'dart:io';

const String _schemaDir = '../packages/core/schema';
const String _outDir = 'packages/agnostic_ui_contract/lib/src/generated';

/// stem do arquivo de schema → stem do arquivo Dart gerado.
const Map<String, String> _artifacts = <String, String>{
  'template-node': 'template_node',
  'envelope': 'envelope',
  'tenant-config': 'tenant_config',
};

const String _header =
    '// GERADO por dart/tool/generate_models.dart — não editar à mão.\n'
    '// Fonte: packages/core/schema (JSON Schema do @yukilabs/agnostic-ui-core).\n'
    '// ignore_for_file: type=lint\n';

void main(List<String> args) {
  final bool check = args.contains('--check');
  final Map<String, String> rendered = <String, String>{};

  for (final MapEntry<String, String> entry in _artifacts.entries) {
    final File schemaFile = File('$_schemaDir/${entry.key}.schema.json');
    final Map<String, Object?> schema =
        jsonDecode(schemaFile.readAsStringSync()) as Map<String, Object?>;
    rendered['${entry.value}.dart'] = _Generator(schema).render();
  }
  rendered['models.dart'] = _renderBarrel();

  var drift = false;
  for (final MapEntry<String, String> out in rendered.entries) {
    final File target = File('$_outDir/${out.key}');
    if (check) {
      final String current =
          target.existsSync() ? target.readAsStringSync() : '';
      if (current != out.value) {
        drift = true;
        stderr.writeln('drift: $_outDir/${out.key} desatualizado');
      }
    } else {
      target.parent.createSync(recursive: true);
      target.writeAsStringSync(out.value);
      stdout.writeln('escrito $_outDir/${out.key}');
    }
  }

  if (check && drift) {
    stderr.writeln(
      'Modelos Dart desatualizados — rode `dart run tool/generate_models.dart` e commite.',
    );
    exitCode = 1;
  }
}

String _renderBarrel() {
  final List<String> exports = _artifacts.values.toList()..sort();
  final StringBuffer b = StringBuffer(_header)
    ..writeln()
    ..writeln('/// Modelos de contrato gerados do JSON Schema do core.')
    ..writeln('library;')
    ..writeln();
  for (final String stem in exports) {
    b.writeln("export '$stem.dart';");
  }
  return b.toString();
}

/// Descreve um tipo Dart resolvido e como (de)serializá-lo.
class _Type {
  _Type(this.dart, this.decode, this.encode);

  /// Tipo Dart não-anulável (ex.: `String`, `List<TemplateNode>`).
  final String dart;

  /// Dado um Dart-expr `v` (valor JSON não-nulo), produz o expr de decode.
  final String Function(String v) decode;

  /// Dado um Dart-expr `v` (campo não-nulo), produz o expr de encode p/ JSON.
  final String Function(String v) encode;
}

class _Field {
  _Field(this.jsonKey, this.dartName, this.type, this.required);

  /// Chave no JSON (preservada na (de)serialização).
  final String jsonKey;

  /// Identificador Dart do campo (palavras reservadas ganham sufixo `_`).
  final String dartName;
  final _Type type;
  final bool required;
}

/// Palavras reservadas do Dart que não podem ser identificadores.
const Set<String> _dartReserved = <String>{
  'assert',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'else',
  'enum',
  'extends',
  'false',
  'final',
  'finally',
  'for',
  'if',
  'in',
  'is',
  'new',
  'null',
  'rethrow',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'var',
  'void',
  'while',
  'with',
  'yield',
};

String _dartName(String jsonKey) =>
    _dartReserved.contains(jsonKey) ? '${jsonKey}_' : jsonKey;

/// Percorre um documento JSON Schema (draft-07, no subconjunto emitido pelo
/// `gen:schema`) e acumula classes e enums Dart.
class _Generator {
  _Generator(this.schema);

  final Map<String, Object?> schema;

  /// Declarações Dart em ordem de descoberta (estável p/ o check de drift).
  final List<String> _decls = <String>[];
  final Set<String> _seen = <String>{};

  String render() {
    final Map<String, Object?> defs =
        (schema['definitions'] as Map<String, Object?>?) ??
            const <String, Object?>{};
    for (final MapEntry<String, Object?> def in defs.entries) {
      _emitObject(def.key, def.value as Map<String, Object?>);
    }
    final StringBuffer b = StringBuffer(_header)..writeln();
    b.writeln(_decls.join('\n'));
    return b.toString();
  }

  String _ref(String pointer) => pointer.split('/').last;

  String _cap(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  /// Resolve o tipo Dart de um sub-schema, registrando classes/enums aninhados.
  /// `owner` é o nome da classe pai; `prop` a propriedade — usados p/ sintetizar
  /// nomes determinísticos (prefixados pelo pai) de objetos/enums inline.
  _Type _typeOf(Map<String, Object?> node, String owner, String prop) {
    final Object? ref = node[r'$ref'];
    if (ref is String) {
      final String name = _ref(ref);
      return _Type(
        name,
        (String v) => '$name.fromJson($v as Map<String, Object?>)',
        (String v) => '$v.toJson()',
      );
    }

    final Object? enumValues = node['enum'];
    if (enumValues is List) {
      final String name = '$owner${_cap(prop)}';
      _emitEnum(name, enumValues.cast<String>());
      return _Type(
        name,
        (String v) => '$name.values.byName($v as String)',
        (String v) => '$v.name',
      );
    }

    final String type = (node['type'] as String?) ?? '';
    switch (type) {
      case 'string':
        return _primitive('String');
      case 'boolean':
        return _primitive('bool');
      case 'number':
        return _primitive('num');
      case 'integer':
        return _primitive('int');
      case 'array':
        final Map<String, Object?> items =
            (node['items'] as Map<String, Object?>?) ??
                const <String, Object?>{};
        final _Type item = _typeOf(items, owner, '${prop}Item');
        return _Type(
          'List<${item.dart}>',
          (String v) =>
              '($v as List<Object?>).map((Object? e) => ${item.decode('e')}).toList()',
          (String v) =>
              '$v.map((${item.dart} e) => ${item.encode('e')}).toList()',
        );
      case 'object':
        if (node.containsKey('properties')) {
          final String name = '$owner${_cap(prop)}';
          _emitObject(name, node);
          return _Type(
            name,
            (String v) => '$name.fromJson($v as Map<String, Object?>)',
            (String v) => '$v.toJson()',
          );
        }
        final Object? additional = node['additionalProperties'];
        if (additional is Map<String, Object?>) {
          final _Type value = _typeOf(additional, owner, '${prop}Value');
          return _Type(
            'Map<String, ${value.dart}>',
            (String v) =>
                '($v as Map<String, Object?>).map((String k, Object? e) => MapEntry<String, ${value.dart}>(k, ${value.decode('e')}))',
            (String v) =>
                '$v.map((String k, ${value.dart} e) => MapEntry<String, Object?>(k, ${value.encode('e')}))',
          );
        }
        return _unknownMap();
    }

    // Sem `type`/`$ref`/`enum`: valor arbitrário (ex.: params/result).
    return _unknown();
  }

  _Type _primitive(String dart) =>
      _Type(dart, (String v) => '$v as $dart', (String v) => v);

  _Type _unknown() => _Type('Object?', (String v) => v, (String v) => v);

  _Type _unknownMap() => _Type(
        'Map<String, Object?>',
        (String v) => '$v as Map<String, Object?>',
        (String v) => v,
      );

  void _emitEnum(String name, List<String> values) {
    if (!_seen.add(name)) return;
    for (final String v in values) {
      if (!RegExp(r'^[a-z][a-zA-Z0-9]*$').hasMatch(v)) {
        throw FormatException(
          'Valor de enum "$v" não é um identificador Dart válido (enum $name); '
          'o gerador precisa de um mapeamento explícito.',
        );
      }
    }
    final StringBuffer b = StringBuffer()
      ..writeln('enum $name {')
      ..writeln('  ${values.join(', ')},')
      ..writeln('}');
    _decls.add(b.toString());
  }

  void _emitObject(String name, Map<String, Object?> node) {
    if (!_seen.add(name)) return;
    final Map<String, Object?> props =
        (node['properties'] as Map<String, Object?>?) ??
            const <String, Object?>{};
    final Set<String> required =
        ((node['required'] as List<Object?>?) ?? const <Object?>[])
            .cast<String>()
            .toSet();

    final List<_Field> fields = <_Field>[];
    for (final MapEntry<String, Object?> p in props.entries) {
      fields.add(
        _Field(
          p.key,
          _dartName(p.key),
          _typeOf(p.value as Map<String, Object?>, name, _cap(p.key)),
          required.contains(p.key),
        ),
      );
    }

    final StringBuffer b = StringBuffer()..writeln('class $name {');

    // Construtor.
    b.writeln('  const $name({');
    for (final _Field f in fields) {
      b.writeln('    ${f.required ? 'required ' : ''}this.${f.dartName},');
    }
    b.writeln('  });');
    b.writeln();

    // fromJson.
    b.writeln('  factory $name.fromJson(Map<String, Object?> json) => $name(');
    for (final _Field f in fields) {
      final String access = "json['${f.jsonKey}']";
      if (f.required) {
        b.writeln('    ${f.dartName}: ${f.type.decode('$access!')},');
      } else {
        b.writeln(
          '    ${f.dartName}: $access == null ? null : ${f.type.decode('$access!')},',
        );
      }
    }
    b.writeln('  );');
    b.writeln();

    // Campos. Tipos já anuláveis (`Object?`) não recebem `?` extra.
    for (final _Field f in fields) {
      final String type = f.required || f.type.dart.endsWith('?')
          ? f.type.dart
          : '${f.type.dart}?';
      b.writeln('  final $type ${f.dartName};');
    }
    b.writeln();

    // toJson.
    b.writeln('  Map<String, Object?> toJson() => <String, Object?>{');
    for (final _Field f in fields) {
      if (f.required) {
        b.writeln("    '${f.jsonKey}': ${f.type.encode(f.dartName)},");
      } else {
        b.writeln(
          "    if (${f.dartName} != null) '${f.jsonKey}': ${f.type.encode('${f.dartName}!')},",
        );
      }
    }
    b.writeln('  };');
    b.writeln('}');
    _decls.add(b.toString());
  }
}
