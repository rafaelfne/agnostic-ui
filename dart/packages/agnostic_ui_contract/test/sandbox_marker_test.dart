import 'package:agnostic_ui_contract/agnostic_ui_contract.dart';
import 'package:test/test.dart';

void main() {
  group('marker/token (F3.4, espelho do core)', () {
    test('parseia um marker de sandbox válido', () {
      final SandboxMarker? marker =
          parseSandboxMarker('app_sandbox_partnerco_happyPath');
      expect(marker?.tenant, 'partnerco');
      expect(marker?.profile, MockProfile.happyPath);
      expect(isSandboxMarker('app_sandbox_acme-1_slow'), isTrue);
    });

    test('rejeita markers malformados (underscore no tenant, profile inválido)',
        () {
      expect(parseSandboxMarker('app_sandbox_part_nerco_happyPath'), isNull);
      expect(parseSandboxMarker('app_sandbox_acme_unknown'), isNull);
      expect(isSandboxMarker('eyJhbGciOiJ...jwt'), isFalse);
    });

    test('resolveTokenMode separa sandbox de live', () {
      final TokenMode sandbox = resolveTokenMode('app_sandbox_acme_empty');
      expect(sandbox, isA<SandboxToken>());
      expect((sandbox as SandboxToken).marker.profile, MockProfile.empty);

      final TokenMode live = resolveTokenMode('header.payload.sig');
      expect(live, isA<LiveToken>());
      expect((live as LiveToken).jwt, 'header.payload.sig');
    });
  });
}
