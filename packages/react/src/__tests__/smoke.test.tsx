import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { REACT_RENDERER_VERSION } from '../index';

describe('react renderer package', () => {
  it('exposes its version', () => {
    expect(REACT_RENDERER_VERSION).toBe('0.0.0');
  });

  it('renders JSX to static markup (toolchain check)', () => {
    expect(renderToStaticMarkup(<div data-x="1">hi</div>)).toBe('<div data-x="1">hi</div>');
  });
});
