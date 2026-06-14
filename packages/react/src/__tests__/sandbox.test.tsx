import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SandboxProvider, useSandbox } from '../sandbox';

describe('SandboxProvider', () => {
  it('propagates the sandbox value via context', () => {
    const Probe = () => {
      const sandbox = useSandbox();
      return <span>{sandbox.enabled ? sandbox.profile : 'live'}</span>;
    };
    const html = renderToStaticMarkup(
      <SandboxProvider value={{ enabled: true, profile: 'happyPath' }}>
        <Probe />
      </SandboxProvider>,
    );
    expect(html).toBe('<span>happyPath</span>');
  });

  it('defaults to disabled without a provider', () => {
    const Probe = () => <span>{useSandbox().enabled ? 'on' : 'off'}</span>;
    expect(renderToStaticMarkup(<Probe />)).toBe('<span>off</span>');
  });
});
