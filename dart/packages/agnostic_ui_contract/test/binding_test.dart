import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  final Map<String, Object?> scope = <String, Object?>{
    'count': 3,
    'price': 10,
    'user': <String, Object?>{'name': 'Ada', 'premium': true},
  };
  Object? ev(String src) => evaluateExpression(src, scope);

  group('binding — gramática (espelho do engine TS, F2.1)', () {
    test('paths preservam o tipo num placeholder inteiro', () {
      expect(ev('{{ count }}'), 3);
      expect(ev('{{ user.name }}'), 'Ada');
      expect(ev('{{ user.premium }}'), true);
    });

    test('aritmética com precedência, parênteses e unário', () {
      expect(ev('{{ price + count * 2 }}'), 16);
      expect(ev('{{ (price + count) * 2 }}'), 26);
      expect(ev('{{ -count + 5 }}'), 2);
    });

    test('comparações e booleanos com curto-circuito', () {
      expect(ev('{{ count > 2 }}'), true);
      expect(ev('{{ count == 3 }}'), true);
      expect(ev('{{ user.premium && count > 2 }}'), true);
      expect(ev('{{ user.premium || missing }}'), true);
      expect(ev('{{ !user.premium }}'), false);
      expect(ev('{{ missing && boom.deep }}'), isNull);
    });

    test('ternário, funções curadas e pipes', () {
      expect(ev("{{ count > 5 ? 'big' : 'small' }}"), 'small');
      expect(ev('{{ upper(user.name) }}'), 'ADA');
      expect(ev('{{ user.name | uppercase }}'), 'ADA');
      expect(ev("{{ concat(user.name, '!') }}"), 'Ada!');
    });

    test('interpolação vira concat', () {
      expect(ev('R\$ {{ price }}'), 'R\$ 10');
      expect(ev('{{ user.name }} ({{ count }})'), 'Ada (3)');
      expect(ev('sem placeholder'), 'sem placeholder');
    });

    test('rejeita função desconhecida e entrada malformada', () {
      expect(() => ev('{{ danger(user) }}'), throwsA(isA<ExpressionError>()));
      expect(() => ev('{{ count + }}'), throwsA(isA<ExpressionError>()));
      expect(() => ev('{{ count count }}'), throwsA(isA<ExpressionError>()));
    });
  });
}
