import { describe, it, expect } from 'vitest';
import { tenantRouteParams } from '../interface/tenant/tenantRouteParams';

describe('tenantRouteParams', () => {
  it('emits one route param per registered tenant', () => {
    expect(tenantRouteParams()).toEqual([{ tenant: 'partnerco' }, { tenant: 'acme' }]);
  });
});
