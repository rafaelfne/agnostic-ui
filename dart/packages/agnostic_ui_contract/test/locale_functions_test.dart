import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  final Map<String, Object?> scope = <String, Object?>{
    'price': 1234.5,
    'rate': 0.156,
    'when': '2026-01-15T10:00:00Z',
  };
  Object? ev(String src, {String? locale}) =>
      evaluateExpression(src, scope, locale: locale);

  group('funções locale-aware (F2.2)', () {
    test('percent e date casam o Intl (en-US)', () {
      expect(ev('{{ rate | percent(1) }}'), '15.6%');
      expect(ev('{{ when | date }}'), '1/15/2026');
    });

    test('o locale é aplicado (percent muda em pt-BR)', () {
      expect(ev('{{ rate | percent(1) }}', locale: 'pt-BR'), isNot('15.6%'));
    });

    test('currency formata com o locale (contém o valor agrupado)', () {
      expect(ev("{{ price | currency('USD') }}"), contains('1,234.50'));
    });

    test('currency sem código de moeda falha', () {
      expect(
          () => ev('{{ price | currency }}'), throwsA(isA<ExpressionError>()));
    });
  });
}
