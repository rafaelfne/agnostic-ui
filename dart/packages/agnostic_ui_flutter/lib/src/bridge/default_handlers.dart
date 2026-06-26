import 'package:flutter/services.dart';

import 'bridge_constants.dart';
import 'native_bridge.dart';

/// Dispara o haptic da plataforma a partir de `{ type }` (HapticType do core).
Future<void> _haptics(Object? params) async {
  final Object? type = params is Map ? params['type'] : null;
  switch (type) {
    case 'light':
      await HapticFeedback.lightImpact();
    case 'medium':
      await HapticFeedback.mediumImpact();
    case 'heavy':
      await HapticFeedback.heavyImpact();
    case 'success' || 'warning' || 'error':
      await HapticFeedback.vibrate();
    default:
      await HapticFeedback.selectionClick();
  }
}

/// Handlers padrão da bridge nativa (F3.2). `haptics` e `closeWebView` usam
/// primitivos do Flutter — sem plugins pesados; `getEnvInfo`/`getCustomerContext`/
/// `openNativeShare` são **injetados pelo host** (que pluga share_plus/device_info
/// na adoção, F10). Só os handlers informados entram no mapa.
Map<String, MethodHandler> defaultBridgeHandlers({
  MethodHandler? getEnvInfo,
  MethodHandler? getCustomerContext,
  MethodHandler? openNativeShare,
  void Function()? onClose,
}) {
  return <String, MethodHandler>{
    BridgeMethods.haptics: (Object? params) async {
      await _haptics(params);
      return null;
    },
    BridgeMethods.closeWebView: (Object? params) async {
      onClose?.call();
      return null;
    },
    if (getEnvInfo != null) BridgeMethods.getEnvInfo: getEnvInfo,
    if (getCustomerContext != null)
      BridgeMethods.getCustomerContext: getCustomerContext,
    if (openNativeShare != null) BridgeMethods.openNativeShare: openNativeShare,
  };
}
