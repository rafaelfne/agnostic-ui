import type { TenantTheme } from '@yukilabs/agnostic-ui-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ThemeProvider, themeToCssVars, useTheme } from '../theme';

describe('themeToCssVars', () => {
  it('maps colors to the tenant CSS variables', () => {
    const theme: TenantTheme = {
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      backgroundColor: '#111',
      logoUrl: 'https://cdn.test/logo.png',
    };
    expect(themeToCssVars(theme)).toEqual({
      '--tenant-primary': '255 0 0',
      '--tenant-primary-rgb': '255, 0, 0',
      '--tenant-secondary': '0 255 0',
      '--tenant-canvas': '#111',
      '--tenant-logo-url': 'url(https://cdn.test/logo.png)',
    });
  });

  it('returns empty for no theme and skips malformed hex', () => {
    expect(themeToCssVars(undefined)).toEqual({});
    expect(themeToCssVars({ primaryColor: 'nope' })).toEqual({});
  });
});

describe('ThemeProvider', () => {
  it('applies the CSS vars and exposes the theme via context', () => {
    const Probe = () => <span>{useTheme()?.primaryColor}</span>;
    const html = renderToStaticMarkup(
      <ThemeProvider theme={{ primaryColor: '#FF0000' }}>
        <Probe />
      </ThemeProvider>,
    );
    expect(html).toContain('--tenant-primary:255 0 0');
    expect(html).toContain('<span>#FF0000</span>');
  });
});
