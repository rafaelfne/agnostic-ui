import type { TenantTheme } from '@yukilabs/agnostic-ui-core';

/**
 * Temas de amostra para o preview (K4). Os descritores reais de tenant vivem no BFF
 * (`tenantDescriptors`, server-side) e não são importáveis no browser do builder —
 * estes são fixtures locais para experimentar o look white-label. `accent` é a cor
 * que dirige o chrome do preview (chip do tenant, botões).
 */
export interface SampleTheme {
  id: string;
  label: string;
  accent: string;
  theme: TenantTheme;
}

export const SAMPLE_THEMES: readonly SampleTheme[] = [
  {
    id: 'partnerco',
    label: 'partnerco',
    accent: '#6D28D9',
    theme: { primaryColor: '#6D28D9', secondaryColor: '#9333EA', backgroundColor: '#ffffff' },
  },
  {
    id: 'acme',
    label: 'acme',
    accent: '#0284C7',
    theme: { primaryColor: '#0284C7', secondaryColor: '#0EA5E9', backgroundColor: '#ffffff' },
  },
];

export function customTheme(primary: string, secondary: string, background: string): TenantTheme {
  return { primaryColor: primary, secondaryColor: secondary, backgroundColor: background };
}
