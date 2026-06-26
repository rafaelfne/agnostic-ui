// Espelho Dart do parser de marker/token do `core` (sandbox/marker.ts).
// Decide o modo de execução **por token**, sem tocar a rede.

/// Perfis de mock do sandbox (sandbox/profile.ts).
enum MockProfile { happyPath, empty, error, slow }

/// Marker de sandbox `app_sandbox_<tenant>_<profile>`: tenant = 1–32 minúsculas,
/// dígitos e hífens; profile = um dos [MockProfile].
final RegExp _markerRe = RegExp(
  r'^app_sandbox_([a-z0-9-]{1,32})_(happyPath|empty|error|slow)$',
);

class SandboxMarker {
  const SandboxMarker({required this.tenant, required this.profile});
  final String tenant;
  final MockProfile profile;
}

bool isSandboxMarker(String token) => _markerRe.hasMatch(token);

MockProfile _profileFrom(String wire) => MockProfile.values.byName(wire);

SandboxMarker? parseSandboxMarker(String token) {
  final RegExpMatch? match = _markerRe.firstMatch(token);
  if (match == null) return null;
  return SandboxMarker(
    tenant: match.group(1)!,
    profile: _profileFrom(match.group(2)!),
  );
}

/// Modo de execução resolvido a partir do token (sandbox vs live). A verificação
/// de assinatura do JWT é hardening do BFF — o nativo só decide a fonte de dados.
sealed class TokenMode {
  const TokenMode();
}

class SandboxToken extends TokenMode {
  const SandboxToken(this.marker);
  final SandboxMarker marker;
}

class LiveToken extends TokenMode {
  const LiveToken(this.jwt);
  final String jwt;
}

TokenMode resolveTokenMode(String token) {
  final SandboxMarker? marker = parseSandboxMarker(token);
  return marker != null ? SandboxToken(marker) : LiveToken(token);
}
