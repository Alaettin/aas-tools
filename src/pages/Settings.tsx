import { useLocale } from '@/context/LocaleContext';

export function SettingsPage() {
  const { t } = useLocale();
  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-txt-secondary mt-1">
          {t('settings.subtitle')}
        </p>
      </div>
    </div>
  );
}
