import 'dart:convert';
import 'dart:io';

import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

/// Runner de conformance do Dart (F2.8). Carrega os MESMOS vetores do core e
/// EXECUTA o binding (resolveTemplate), comparando com `expected`. É a prova de
/// paridade cross-renderer: o renderer nativo resolve idêntico ao oráculo TS.
void main() {
  // `dart test` roda com cwd = raiz do pacote (dart/packages/agnostic_ui_contract).
  final Directory vectorsDir = Directory(
    '../../../packages/core/conformance/vectors',
  );

  test('o corpus de conformance do core existe', () {
    expect(
      vectorsDir.existsSync(),
      isTrue,
      reason: 'esperado em ${vectorsDir.absolute.path}',
    );
  });

  final List<File> files = vectorsDir.existsSync()
      ? vectorsDir
          .listSync()
          .whereType<File>()
          .where((File f) => f.path.endsWith('.json'))
          .toList()
      : <File>[];

  for (final File file in files) {
    final Map<String, Object?> raw =
        jsonDecode(file.readAsStringSync()) as Map<String, Object?>;
    final String name = raw['name']! as String;

    test('conformance: $name (template + context → expected)', () {
      final TemplateNode template = TemplateNode.fromJson(
        raw['template']! as Map<String, Object?>,
      );
      final Map<String, Object?> context =
          (raw['context']! as Map).cast<String, Object?>();
      final String? locale = raw['locale'] as String?;

      final TemplateNode resolved = resolveTemplate(
        template,
        context,
        locale: locale,
      );
      expect(resolved.toJson(), equals(raw['expected']));
    });
  }
}
