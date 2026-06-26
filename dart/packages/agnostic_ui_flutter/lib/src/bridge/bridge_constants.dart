/// Nomes dos métodos (request) e eventos da bridge — espelho do `core`
/// (bridge/constants.ts). Vocabulário fechado, compartilhado com o host nativo.
abstract final class BridgeMethods {
  static const String closeWebView = 'closeWebView';
  static const String getEnvInfo = 'getEnvInfo';
  static const String getCustomerContext = 'getCustomerContext';
  static const String openNativeShare = 'openNativeShare';
  static const String haptics = 'haptics';
}

abstract final class BridgeEvents {
  static const String tokenReady = 'tokenReady';
  static const String themeChanged = 'themeChanged';
  static const String customerChanged = 'customerChanged';
  static const String deepLink = 'deepLink';
}
