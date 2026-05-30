/**
 * Key under which the native host injects the access token on the WebView's
 * global object. The core never reads `window`; consumers do
 * `window[ACCESS_TOKEN_KEY]`.
 */
export const ACCESS_TOKEN_KEY = '__APP_ACCESS_TOKEN__';

export const BRIDGE_ORIGINS = ['app', 'sdk'] as const;
export type BridgeOrigin = (typeof BRIDGE_ORIGINS)[number];

export const BRIDGE_MESSAGE_TYPES = ['request', 'response', 'event', 'error'] as const;
export type BridgeMessageType = (typeof BRIDGE_MESSAGE_TYPES)[number];

export const BRIDGE_METHODS = [
  'closeWebView',
  'getEnvInfo',
  'getCustomerContext',
  'openNativeShare',
  'haptics',
] as const;
export type BridgeMethod = (typeof BRIDGE_METHODS)[number];

export const BRIDGE_EVENTS = ['tokenReady', 'themeChanged', 'customerChanged', 'deepLink'] as const;
export type BridgeEvent = (typeof BRIDGE_EVENTS)[number];
