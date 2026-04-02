import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { Hexagon, ArrowRight, Loader2, Globe } from 'lucide-react';
import type { Locale } from '@/i18n';
import type { TranslationKey } from '@/context/LocaleContext';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isRegister) {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        setError(error);
      } else {
        setSuccess(t('auth.registerSuccess'));
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }

    setLoading(false);
  };

  // Error keys from AuthContext are translation keys
  const displayError = error ? t(error as TranslationKey) : '';

  return (
    <div className="min-h-screen bg-bg-primary bg-dot-pattern flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="relative">
            <Hexagon className="w-10 h-10 text-accent" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-accent">A</span>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="font-mono text-xl font-bold tracking-tight">AAS Tools</h1>
            <p className="text-2xs text-txt-muted font-mono uppercase tracking-widest">
              Asset Administration Shell
            </p>
          </div>
          {/* Language toggle */}
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4 text-txt-muted" />
            {(['de', 'en'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`text-xs font-mono font-medium px-2 py-1 rounded-sm transition-colors ${
                  locale === l
                    ? 'bg-accent text-bg-primary'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-bg-surface border border-border rounded p-6">
          <h2 className="font-mono text-lg font-semibold mb-1">
            {isRegister ? t('auth.signUp') : t('auth.signIn')}
          </h2>
          <p className="text-sm text-txt-secondary mb-6">
            {isRegister ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
                  {t('auth.name')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                  placeholder={t('auth.namePlaceholder')}
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                placeholder={t('auth.emailPlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {displayError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400">
                {displayError}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-sm px-3 py-2 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm py-2.5 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isRegister ? t('auth.register') : t('auth.signIn')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-txt-secondary hover:text-accent transition-colors"
            >
              {isRegister
                ? <>{t('auth.alreadyHaveAccount')} <span className="text-accent">{t('auth.signIn')}</span></>
                : <>{t('auth.noAccount')} <span className="text-accent">{t('auth.register')}</span></>
              }
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-2xs text-txt-muted mt-6 font-mono">
          v0.1.0 — Neoception
        </p>
      </div>
    </div>
  );
}
