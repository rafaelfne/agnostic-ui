import type { TenantTheme } from '@yukilabs/agnostic-ui-core';
import { type CSSProperties, type ReactNode, createContext, useContext } from 'react';

/** Parses `#RRGGBB` (or `RRGGBB`) into RGB channels; null for anything else. */
function hexChannels(hex: string): [number, number, number] | null {
  const digits = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())?.[1];
  if (digits === undefined) return null;
  const int = parseInt(digits, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/**
 * Maps a tenant theme to CSS custom properties — the **same** variables the BFF
 * injects server-side (`tenantThemeCssVars`), so a component styled against
 * `--tenant-primary` works in SSR and on the client. `primary`/`secondary` become
 * RGB channel triplets (for `rgb(var(--tenant-primary) / .5)`); a malformed hex is
 * skipped, not emitted as `NaN`.
 */
export function themeToCssVars(theme: TenantTheme | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (theme === undefined) return vars;

  const primary = hexChannels(theme.primaryColor);
  if (primary) {
    vars['--tenant-primary'] = primary.join(' ');
    vars['--tenant-primary-rgb'] = primary.join(', ');
  }
  const secondary = theme.secondaryColor ? hexChannels(theme.secondaryColor) : null;
  if (secondary) vars['--tenant-secondary'] = secondary.join(' ');
  if (theme.backgroundColor) vars['--tenant-canvas'] = theme.backgroundColor;
  if (theme.logoUrl) vars['--tenant-logo-url'] = `url(${theme.logoUrl})`;
  return vars;
}

const ThemeContext = createContext<TenantTheme | undefined>(undefined);

export function useTheme(): TenantTheme | undefined {
  return useContext(ThemeContext);
}

export interface ThemeProviderProps {
  theme?: TenantTheme;
  children?: ReactNode;
}

/**
 * Provides the tenant theme via context and applies its CSS variables to a
 * wrapping element (inline style — SSR-friendly, no `:root` mutation or flash).
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps): ReactNode {
  return (
    <ThemeContext.Provider value={theme}>
      <div data-sdui-theme style={themeToCssVars(theme) as CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
