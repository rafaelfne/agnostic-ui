import { type ReactElement } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n';

/** Light/dark toggle backed by next-themes (class strategy, persisted). */
export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t('topbar.toggleTheme')}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
