import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, ChevronDown, User } from 'lucide-react';

export function Header() {
  const { profile, signOut } = useAuth();
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
          <div className="absolute right-0 top-full mt-1 w-48 bg-bg-surface border border-border rounded shadow-lg animate-fade-in">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-txt-primary truncate">
                {profile?.display_name}
              </p>
              <p className="text-2xs text-txt-muted truncate">{profile?.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => { signOut().catch(() => {}); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-bg-elevated rounded-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
