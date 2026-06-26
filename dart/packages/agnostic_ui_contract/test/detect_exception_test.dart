import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  group('detectException (F9 — semântica compartilhada com o React)', () {
    test('acha RequestResult{success:false} e extrai error.message', () {
      final SduiException? e = detectException(const <String, Object?>{
        'balance': <String, Object?>{
          'success': false,
          'error': <String, Object?>{'message': 'falhou'},
        },
      });
      expect(e?.message, 'falhou');
      expect(e?.code, 'request_failed');
    });

    test('context são (success:true / vazio) → null', () {
      expect(
        detectException(const <String, Object?>{
          'balance': <String, Object?>{'success': true, 'amount': 10},
        }),
        isNull,
      );
      expect(detectException(const <String, Object?>{}), isNull);
    });

    test('success:false sem error usa a message do result ou um default', () {
      expect(
        detectException(const <String, Object?>{
          'x': <String, Object?>{'success': false, 'message': 'oops'},
        })?.message,
        'oops',
      );
      expect(
        detectException(const <String, Object?>{
          'x': <String, Object?>{'success': false},
        })?.message,
        'Algo deu errado',
      );
    });
  });
}
