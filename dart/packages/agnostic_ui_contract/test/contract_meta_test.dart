import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  test('schemaArtifacts cobre os três schemas de contrato do core', () {
    expect(
      ContractMeta.schemaArtifacts,
      containsAll(<String>['template-node', 'envelope', 'tenant-config']),
    );
  });
}
