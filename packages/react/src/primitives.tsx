import type { ComponentRegistry } from './registry';

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);
const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * Generic HTML primitives — the base SDUI vocabulary. Apps register their own
 * component types over these via `createRegistry`. Kept deliberately small and
 * presentation-neutral; styling/theming is a later wave.
 */
export const defaultRegistry: ComponentRegistry = {
  screen: ({ children }) => <div data-sdui="screen">{children}</div>,
  section: ({ children }) => <section>{children}</section>,
  stack: ({ children }) => <div data-sdui="stack">{children}</div>,
  heading: ({ props }) => <h2>{text(props.title ?? props.text)}</h2>,
  text: ({ props, children }) => (
    <span>{props.text !== undefined ? text(props.text) : children}</span>
  ),
  button: ({ props }) => <button type="button">{text(props.label ?? props.text)}</button>,
  image: ({ props }) => <img src={str(props.src)} alt={text(props.alt)} />,
};
