import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { LogOut, ChevronDown, User, Globe } from 'lucide-react';
import type { Locale } from '@/i18n';

const LOCALE_LABELS: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
};

export function Header() {
  const { profile, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (profile?.display_name || profile?.email || '')
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 bg-bg-surface/80 backdrop-blur-sm border-b border-border flex items-center justify-end px-6 sticky top-0 z-20">
      {/* User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-sm hover:bg-bg-elevated transition-colors"
        >
          <User className="w-5 h-5 text-txt-secondary" />
          <span className="text-sm font-medium text-txt-primary hidden sm:block">
            {profile?.display_name || profile?.email}
          </span>
          {initials && (
            <span className="text-xs font-mono font-bold text-accent bg-accent-muted px-1.5 py-0.5 rounded-sm hidden sm:block">
              {initials}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-txt-muted" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-bg-surface border border-border rounded shadow-lg animate-fade-in">
            {/* User info */}
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-txt-primary truncate">
                {profile?.display_name}
              </p>
              <p className="text-2xs text-txt-muted truncate">{profile?.email}</p>
            </div>

            {/* Language Switch */}
            <div className="p-1 border-b border-border">
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-txt-muted" />
                  <span className="text-2xs text-txt-muted font-medium uppercase tracking-wider">
                    {t('language')}
                  </span>
                </div>
                <div className="flex gap-1">
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`flex-1 text-xs font-mono font-medium px-3 py-1.5 rounded-sm transition-colors ${
                        locale === l
                          ? 'bg-accent text-bg-primary'
                          : 'bg-bg-elevated text-txt-secondary hover:text-txt-primary'
                      }`}
                    >
                      {LOCALE_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="p-1">
              <button
                onClick={() => { setMenuOpen(false); signOut().catch(() => {}); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-bg-elevated rounded-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('auth.signOut')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
