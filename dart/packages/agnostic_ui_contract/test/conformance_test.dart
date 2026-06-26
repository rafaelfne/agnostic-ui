import 'dart:convert';
import 'dart:io';

import 'package:test/test.dart';

/// Runner de conformance (esqueleto, F1.6). Os vetores são compartilhados e
/// vivem no core; aqui o Dart só valida que o corpus está bem-formado e é lido.
/// A execução do binding (resolver template+context e comparar com `expected`)
/// chega em F2.
void main() {
  // `dart test` roda com cwd = raiz do pacote (dart/packages/agnostic_ui_contract).
  final Directory vectorsDir = Directory(
    '../../../packages/core/conformance/vectors',
  );

  test('o corpus de conformance do core existe e é lido pelo Dart', () {
    expect(
      vectorsDir.existsSync(),
      isTrue,
      reason: 'esperado em ${vectorsDir.absolute.path}',
    );

    final List<File> files = vectorsDir
        .listSync()
        .whereType<File>()
        .where((File f) => f.path.endsWith('.json'))
        .toList();
    expect(files, isNotEmpty);

    for (final File f in files) {
      final Object? raw = jsonDecode(f.readAsStringSync());
      expect(raw, isA<Map<String, Object?>>(), reason: f.path);
      final Map<String, Object?> vector = raw! as Map<String, Object?>;
      expect(vector['name'], isA<String>(), reason: f.path);
      expect(vector['template'], isA<Map<String, Object?>>(), reason: f.path);
      expect(vector['context'], isA<Map<String, Object?>>(), reason: f.path);
      expect(vector['expected'], isA<Map<String, Object?>>(), reason: f.path);
    }
  });
}
