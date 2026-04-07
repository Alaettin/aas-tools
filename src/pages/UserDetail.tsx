import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, CheckCircle, Shield, User, BookOpen } from 'lucide-react';
import { useUserDetail } from '@/hooks/useUserDetail';
import { useLocale } from '@/context/LocaleContext';
import { tools } from '@/tools/registry';

const toolList = tools.filter(t => t.category === 'tool');
const connectorList = tools.filter(t => t.category === 'connector');
import { supabase } from '@/lib/supabase';
import type { Manual } from '@/docs/types';
import type { UserRole } from '@/types';

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  if (!userId) {
    navigate('/users', { replace: true });
    return null;
  }

  return <UserDetailContent userId={userId} />;
}

function UserDetailContent({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const {
    profile, role, setRole, toolAccess, toggleTool, docAccess, toggleDoc,
    loading, saving, saved, error, save,
  } = useUserDetail(userId);

  const [manuals, setManuals] = useState<Manual[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('doc_manuals')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (data) setManuals(data as Manual[]);
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <p className="text-sm text-red-400">{t('userDetail.notFound')}</p>
      </div>
    );
  }

  const isAdmin = role === 'admin';
  const memberSince = new Date(profile.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const initials = (profile.display_name || profile.email || '')
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-2xl animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate('/users')}
        className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-6 font-mono"
      >
        <ArrowLeft className="w-3 h-3" />
        {t('nav.users')}
      </button>

      {/* User Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-sm bg-accent-muted flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-mono font-bold text-accent">{initials}</span>
        </div>
        <div>
          <h1 className="font-mono text-xl font-bold">
            {profile.display_name || profile.email}
          </h1>
          <p className="text-sm text-txt-muted">
            {profile.email} — {t('userDetail.memberSince', { date: memberSince })}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Role */}
      <div className="bg-bg-surface border border-border rounded mb-6">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('userDetail.role')}
            </h2>
          </div>
        </div>
        <div className="p-5">
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            <option value="admin">{t('userDetail.roleAdmin')}</option>
            <option value="user">{t('userDetail.roleUser')}</option>
          </select>
          <p className="text-2xs text-txt-muted mt-2">
            {t('userDetail.roleDescription')}
          </p>
        </div>
      </div>

      {/* Tool Access */}
      <div className="bg-bg-surface border border-border rounded mb-6">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('userDetail.toolAccess')}
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {toolList.length === 0 ? (
            <p className="text-sm text-txt-muted">{t('userDetail.noTools')}</p>
          ) : (
            toolList.map(tool => (
              <label key={tool.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin || toolAccess.has(tool.id)}
                  disabled={isAdmin}
                  onChange={() => toggleTool(tool.id)}
                  className="accent-accent w-4 h-4"
                />
                <div>
                  <span className="text-sm text-txt-primary">{tool.name}</span>
                  <span className="text-xs text-txt-muted ml-2">{tool.description}</span>
                </div>
              </label>
            ))
          )}
          {isAdmin && (
            <p className="text-2xs text-txt-muted mt-2">
              {t('userDetail.adminToolHint')}
            </p>
          )}
        </div>
      </div>

      {/* Connector Access */}
      <div className="bg-bg-surface border border-border rounded mb-6">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('userDetail.connectorAccess')}
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {connectorList.length === 0 ? (
            <p className="text-sm text-txt-muted">{t('userDetail.noConnectors')}</p>
          ) : (
            connectorList.map(tool => (
              <label key={tool.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin || toolAccess.has(tool.id)}
                  disabled={isAdmin}
                  onChange={() => toggleTool(tool.id)}
                  className="accent-accent w-4 h-4"
                />
                <div>
                  <span className="text-sm text-txt-primary">{tool.name}</span>
                  <span className="text-xs text-txt-muted ml-2">{tool.description}</span>
                </div>
              </label>
            ))
          )}
          {isAdmin && (
            <p className="text-2xs text-txt-muted mt-2">
              {t('userDetail.adminConnectorHint')}
            </p>
          )}
        </div>
      </div>

      {/* Doc Access */}
      <div className="bg-bg-surface border border-border rounded mb-6">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('userDetail.docAccess')}
            </h2>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {manuals.length === 0 ? (
            <p className="text-sm text-txt-muted">{t('userDetail.noDocs')}</p>
          ) : (
            manuals.map(manual => (
              <label
                key={manual.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isAdmin || docAccess.has(manual.id)}
                  disabled={isAdmin}
                  onChange={() => toggleDoc(manual.id)}
                  className="accent-accent w-4 h-4"
                />
                <div>
                  <span className="text-sm text-txt-primary">{manual.title}</span>
                  {manual.description && (
                    <span className="text-xs text-txt-muted ml-2">{manual.description}</span>
                  )}
                </div>
              </label>
            ))
          )}
          {isAdmin && (
            <p className="text-2xs text-txt-muted mt-2">
              {t('userDetail.adminDocHint')}
            </p>
          )}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => save()}
        disabled={saving}
        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2.5 rounded-sm transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saved ? t('userDetail.saved') : t('userDetail.save')}
      </button>
    </div>
  );
}
