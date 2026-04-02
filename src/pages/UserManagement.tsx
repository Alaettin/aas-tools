import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import {
  Shield,
  User,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { Profile, UserRole } from '@/types';

function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-2xs font-mono font-medium text-accent bg-accent-muted px-2 py-0.5 rounded-sm">
        <Shield className="w-3 h-3" />
        ADMIN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-2xs font-mono font-medium text-txt-muted bg-bg-elevated px-2 py-0.5 rounded-sm">
      <User className="w-3 h-3" />
      USER
    </span>
  );
}

function UserRow({ user, currentUserId, youLabel, locale }: { user: Profile; currentUserId: string; youLabel: string; locale: string }) {
  const navigate = useNavigate();
  const isCurrentUser = user.id === currentUserId;

  const initials = (user.display_name || user.email)
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const createdDate = new Date(user.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <tr
      onClick={() => navigate(`/users/${user.id}`)}
      className="border-b border-border last:border-0 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-accent-muted/50 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-mono font-bold text-accent/70">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-txt-primary truncate">
              {user.display_name || '—'}
              {isCurrentUser && (
                <span className="text-2xs text-txt-muted font-mono ml-2">{youLabel}</span>
              )}
            </p>
            <p className="text-2xs text-txt-muted truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-txt-secondary font-mono">{createdDate}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="w-4 h-4 text-txt-muted inline-block" />
      </td>
    </tr>
  );
}

export function UserManagementPage() {
  const { profile } = useAuth();
  const { t, locale } = useLocale();
  const { users, loading, error, fetchUsers } = useUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  const filtered = users.filter(u => {
    const matchesSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold">{t('users.title')}</h1>
        <p className="text-sm text-txt-secondary mt-1">
          {t('users.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="w-full bg-bg-input border border-border rounded-sm pl-9 pr-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="appearance-none bg-bg-input border border-border rounded-sm px-3 py-2 pr-8 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors cursor-pointer"
          >
            <option value="all">{t('users.allRoles')}</option>
            <option value="admin">{t('userDetail.roleAdmin')}</option>
            <option value="user">{t('userDetail.roleUser')}</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted pointer-events-none" />
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm text-sm text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('users.refresh')}
        </button>
      </div>

      <div className="bg-bg-surface border border-border rounded overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">
                  {t('users.columnUser')}
                </th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">
                  {t('users.columnRole')}
                </th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">
                  {t('users.columnRegistered')}
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-txt-muted">
                    {t('users.noUsersFound')}
                  </td>
                </tr>
              ) : (
                filtered.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUserId={profile?.id || ''}
                    youLabel={t('users.you')}
                    locale={locale}
                  />
                ))
              )}
            </tbody>
          </table>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-2xs text-txt-muted font-mono">
              {t('users.countLabel', { filtered: filtered.length, total: users.length })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
