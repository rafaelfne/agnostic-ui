import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  test('SduiDocument round-trip com refresh e exception (F5.1)', () {
    final Map<String, Object?> json = <String, Object?>{
      'screenId': 'home',
      'version': '2',
      'root': <String, Object?>{
        'type': 'text',
        'props': <String, Object?>{'value': '{{ name }}'},
      },
      'context': <String, Object?>{'name': 'Ada'},
      'refresh': <String, Object?>{'enabled': true},
      'exception': <String, Object?>{
        'code': 'core_error',
        'message': 'indisponível'
      },
    };
    final SduiDocument doc = SduiDocument.fromJson(json);
    expect(doc.screenId, 'home');
    expect(doc.root.type, 'text');
    expect(doc.refresh?.enabled, isTrue);
    expect(doc.exception?.message, 'indisponível');
    expect(doc.toJson(), json);
  });
}
