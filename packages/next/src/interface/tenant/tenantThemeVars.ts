import type { TenantTheme } from '@yukilabs/agnostic-ui-core';

/** Parses `#RRGGBB` (or `RRGGBB`) into RGB channels; null for anything else. */
function hexChannels(hex: string): [number, number, number] | null {
  const digits = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())?.[1];
  if (!digits) {
    return null;
  }
  const int = parseInt(digits, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/**
 * Maps a tenant theme to the `:root` CSS custom properties (manual, Parte 3.3).
 * `primary`/`secondary` become RGB channel triplets so Tailwind-style
 * `rgb(var(--tenant-primary-rgb))` and alpha (`rgb(var(--tenant-primary) / .5)`)
 * both work; `canvas` stays a literal color and `logo` a `url(...)`. A malformed
 * hex is skipped rather than emitted as `NaN`. Injected server-side (SSR HTML);
 * the client theme provider lands in the react package (Fase 2).
 */
export function tenantThemeCssVars(theme: TenantTheme | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!theme) {
    return vars;
  }

  const primary = hexChannels(theme.primaryColor);
  if (primary) {
    vars['--tenant-primary'] = primary.join(' ');
    vars['--tenant-primary-rgb'] = primary.join(', ');
  }

  const secondary = theme.secondaryColor ? hexChannels(theme.secondaryColor) : null;
  if (secondary) {
    vars['--tenant-secondary'] = secondary.join(' ');
  }

  if (theme.backgroundColor) {
    vars['--tenant-canvas'] = theme.backgroundColor;
  }

  if (theme.logoUrl) {
    vars['--tenant-logo-url'] = `url(${theme.logoUrl})`;
  }

  return vars;
}
