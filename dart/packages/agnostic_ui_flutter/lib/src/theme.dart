import 'package:flutter/material.dart';

/// Tokens de tema por tenant (espelho do `TenantTheme` do core, manual §3.3):
/// cores aplicadas como `ThemeData` e lidas pelos componentes via `SduiScope`.
class SduiTheme {
  const SduiTheme({required this.primary, this.secondary, this.background});

  final Color primary;
  final Color? secondary;
  final Color? background;

  /// Constrói a partir do mapa de tema do TenantConfig (`{ primaryColor, … }`).
  factory SduiTheme.fromTenant(Map<String, Object?> theme) => SduiTheme(
        primary: _parseColor(theme['primaryColor']) ?? const Color(0xFF1565C0),
        secondary: _parseColor(theme['secondaryColor']),
        background: _parseColor(theme['backgroundColor']),
      );

  @override
  bool operator ==(Object other) =>
      other is SduiTheme &&
      other.primary == primary &&
      other.secondary == secondary &&
      other.background == background;

  @override
  int get hashCode => Object.hash(primary, secondary, background);
}

Color? _parseColor(Object? value) {
  if (value is! String) return null;
  String hex = value.replaceFirst('#', '');
  if (hex.length == 6) hex = 'FF$hex';
  final int? n = int.tryParse(hex, radix: 16);
  return n == null ? null : Color(n);
}

/// Mapeia o tema do tenant para um `ThemeData` do Flutter — paridade com as CSS
/// vars que o BFF injeta no SSR. O host aplica no `MaterialApp`.
ThemeData buildThemeData(SduiTheme theme) => ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: theme.primary,
        primary: theme.primary,
        secondary: theme.secondary ?? theme.primary,
      ),
      scaffoldBackgroundColor: theme.background,
    );
