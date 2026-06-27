import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:agnostic_ui_flutter/agnostic_ui_flutter.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const Map<String, Object?> _schema = <String, Object?>{
  'type': 'object',
  'required': <Object?>['value'],
  'properties': <String, Object?>{
    'value': <String, Object?>{'type': 'string'},
  },
};

void main() {
  group('G6 — validação de props (espelho do core)', () {
    test('required ausente e tipo errado geram problemas; ok → vazio', () {
      expect(
          validatePropsAgainstSchema(_schema, <String, Object?>{'value': 'hi'}),
          isEmpty);
      expect(
        validatePropsAgainstSchema(_schema, <String, Object?>{}),
        <String>['missing required prop: value'],
      );
      expect(
        validatePropsAgainstSchema(_schema, <String, Object?>{'value': 42}),
        <String>['prop value: expected string'],
      );
    });

    test('SduiRegistry carrega o contrato e valida; sem contrato → vazio', () {
      final SduiRegistry registry = SduiRegistry(
        <String, SduiBuilder>{
          'text': (BuildContext context, TemplateNode node,
                  List<Widget> children) =>
              const SizedBox.shrink(),
        },
        contracts: <String, Map<String, Object?>>{'text': _schema},
      );
      expect(registry.propsSchemaFor('text'), _schema);
      expect(registry.validateProps('text', <String, Object?>{'value': 'hi'}),
          isEmpty);
      expect(
        registry.validateProps('text', <String, Object?>{}),
        <String>['missing required prop: value'],
      );
      expect(registry.validateProps('unknown', <String, Object?>{}), isEmpty);
    });
  });
}
