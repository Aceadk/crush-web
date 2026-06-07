'use client';

/**
 * Locale switcher (Phase 8 Step 18). Reads/writes the active locale via the
 * I18n context (cookie-persisted, instant switch — no full reload). Uses the
 * shared dropdown-menu primitive for accessible keyboard/focus behavior.
 */

import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  cn,
} from '@crush/ui';
import { useI18n } from './I18nProvider';
import { useTranslations } from './I18nProvider';
import { LOCALE_OPTIONS, localeName } from './locale-names';
import type { Locale } from './locales';

interface LocaleSwitcherProps {
  /** Compact = icon-only trigger (sidebar); otherwise shows the current name. */
  compact?: boolean;
  className?: string;
}

export function LocaleSwitcher({ compact = false, className }: LocaleSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const t = useTranslations('settings');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.t('language')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
      >
        <Globe className="w-4 h-4" aria-hidden="true" />
        {!compact && <span>{localeName(locale)}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel>{t.t('language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(v) => setLocale(v as Locale)}
        >
          {LOCALE_OPTIONS.map(({ code, name }) => (
            <DropdownMenuRadioItem key={code} value={code}>
              <span className="flex-1">{name}</span>
              {code === locale && (
                <Check className="w-4 h-4 ml-2" aria-hidden="true" />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
