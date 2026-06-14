import type { ReactElement } from 'react';

export interface StringListInputProps {
  label: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
}

/** Edits a `string[]` as a comma-separated field — trims and drops empties. */
export function StringListInput({ label, value, onChange }: StringListInputProps): ReactElement {
  return (
    <label>
      {label} <small>(separados por vírgula)</small>
      <input
        value={value.join(', ')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter((item) => item.length > 0),
          )
        }
      />
    </label>
  );
}
