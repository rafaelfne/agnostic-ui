import { type ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface StringListInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Optional helper text shown next to the label. */
  hint?: string;
}

/**
 * Comma-separated string-list editor (migrated to shadcn Input/Label).
 * Same value contract as the original: parses on change, trims, drops blanks.
 */
export function StringListInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: StringListInputProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {hint && <span className="font-normal">{hint}</span>}
      </Label>
      <Input
        className="font-mono"
        value={value.join(', ')}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );
}
