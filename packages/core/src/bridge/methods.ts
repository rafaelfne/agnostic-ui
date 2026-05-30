export interface CloseWebViewParams {
  reason?: string;
}

export interface EnvInfo {
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  osVersion: string;
  locale: string;
  bridgeVersion: string;
}

export interface CustomerContext {
  customerId: string;
  tenantId: string;
  locale?: string;
  attributes?: Record<string, unknown>;
}

export interface OpenNativeShareParams {
  title?: string;
  text?: string;
  url?: string;
}

export interface OpenNativeShareResult {
  shared: boolean;
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export interface HapticsParams {
  type: HapticType;
}

export interface BridgeMethodContract<Params, Result> {
  params: Params;
  result: Result;
}

/**
 * Typed map of every request method the bridge supports. Both the SDK and the
 * native hosts implement against this contract so payloads stay in sync.
 */
export interface BridgeMethodContracts {
  closeWebView: BridgeMethodContract<CloseWebViewParams | undefined, void>;
  getEnvInfo: BridgeMethodContract<undefined, EnvInfo>;
  getCustomerContext: BridgeMethodContract<undefined, CustomerContext>;
  openNativeShare: BridgeMethodContract<OpenNativeShareParams, OpenNativeShareResult>;
  haptics: BridgeMethodContract<HapticsParams, void>;
}
