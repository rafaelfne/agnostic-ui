import { type ReactElement } from 'react';
import { Check, Globe } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LOCALE_LABELS, LOCALES } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/i18n';

/** Language switcher (English default, pt-BR available) — persisted via I18nProvider. */
export function LanguageToggle(): ReactElement {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label={t('topbar.language')}>
          <Globe className="size-4 text-muted-foreground" />
          <span className="text-sm">{LOCALE_LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLocale(l)} className="justify-between">
            {LOCALE_LABELS[l]}
            {l === locale && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
