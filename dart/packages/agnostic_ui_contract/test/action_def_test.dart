import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  group('ActionDef.fromJson (F4, espelho do core)', () {
    test('decodifica navegação com target e label', () {
      final ActionDef a = ActionDef.fromJson(<String, Object?>{
        'type': 'navigate',
        'target': '/invest',
        'label': 'Investir',
      });
      expect(a, isA<NavigateAction>());
      expect((a as NavigateAction).target, '/invest');
      expect(a.label, 'Investir');
    });

    test('decodifica back e refreshHomePage sem target', () {
      expect(ActionDef.fromJson(<String, Object?>{'type': 'back'}),
          isA<BackAction>());
      expect(
        ActionDef.fromJson(<String, Object?>{'type': 'refreshHomePage'}),
        isA<RefreshHomePageAction>(),
      );
    });

    test('decodifica bridge com method e params', () {
      final ActionDef a = ActionDef.fromJson(<String, Object?>{
        'type': 'bridge',
        'method': 'haptics',
        'params': <String, Object?>{'type': 'light'},
      });
      expect(a, isA<BridgeAction>());
      expect((a as BridgeAction).method, 'haptics');
      expect(a.params, <String, Object?>{'type': 'light'});
    });

    test('tipo desconhecido lança FormatException', () {
      expect(
        () => ActionDef.fromJson(<String, Object?>{'type': 'teleport'}),
        throwsFormatException,
      );
    });
  });
}
