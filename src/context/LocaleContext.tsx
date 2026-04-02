import { createContext, useContext, useState, type ReactNode } from 'react';
import { de } from '@/i18n/de';
import { en } from '@/i18n/en';
import type { Locale } from '@/i18n';

export type TranslationKey = keyof typeof de;
type Translations = Record<TranslationKey, string>;

const translations: Record<Locale, Translations> = { de, en: en as Translations };

const LOCALE_STORAGE_KEY = 'aas_locale';

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch { /* noop */ }
  return 'de';
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, l); } catch { /* noop */ }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = translations[locale][key] || translations.de[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
