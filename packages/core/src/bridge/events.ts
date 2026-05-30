export interface TokenReadyPayload {
  token: string;
}

export interface ThemeChangedPayload {
  theme: string;
}

export interface CustomerChangedPayload {
  customerId: string;
}

export interface DeepLinkPayload {
  url: string;
}

/**
 * Typed map of every event the native host can push to the WebView.
 */
export interface BridgeEventPayloads {
  tokenReady: TokenReadyPayload;
  themeChanged: ThemeChangedPayload;
  customerChanged: CustomerChangedPayload;
  deepLink: DeepLinkPayload;
}
