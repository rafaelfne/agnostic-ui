import { describe, it, expect } from 'vitest';
import { tenantThemeCssVars } from '../interface/tenant/tenantThemeVars';
import { getTenantConfig } from '../infra/tenant/tenantConfigStore';

describe('tenantThemeCssVars', () => {
  it('maps the partnerco theme to the CSS vars from the manual (Parte 3.3)', () => {
    expect(tenantThemeCssVars(getTenantConfig('partnerco')?.theme)).toEqual({
      '--tenant-primary': '26 86 219',
      '--tenant-primary-rgb': '26, 86, 219',
      '--tenant-secondary': '147 51 234',
      '--tenant-canvas': '#F5F5F5',
      '--tenant-logo-url': 'url(/imgs/partnerlogo.png)',
    });
  });

  it('produces a distinct primary for the second tenant', () => {
    const vars = tenantThemeCssVars(getTenantConfig('acme')?.theme);
    expect(vars['--tenant-primary']).toBe('14 159 110');
    expect(vars['--tenant-primary-rgb']).toBe('14, 159, 110');
    expect(vars['--tenant-canvas']).toBe('#0B1120');
  });

  it('returns no vars when the theme is absent', () => {
    expect(tenantThemeCssVars(undefined)).toEqual({});
  });

  it('skips a malformed hex instead of emitting NaN', () => {
    expect(tenantThemeCssVars({ primaryColor: 'not-a-hex' })).toEqual({});
  });
});
