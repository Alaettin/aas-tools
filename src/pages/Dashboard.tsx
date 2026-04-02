import { useEffect, useState } from 'react';
import { Database, Hexagon, FileSpreadsheet, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { supabase } from '@/lib/supabase';

interface Stats {
  dtiConnectors: number;
  dtiAssets: number;
  aasProjects: number;
  excelConnectors: number;
}

interface ActivityItem {
  type: 'dti' | 'aas' | 'excel';
  name: string;
  updatedAt: string;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const { t, locale } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('dashboard.timeJustNow');
    if (mins < 60) return t('dashboard.timeMinutes', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('dashboard.timeHours', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('dashboard.timeDays', { n: days });
    return new Date(dateStr).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US');
  };

  const greeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  useEffect(() => {
    if (!profile) return;
    let mounted = true;

    (async () => {
      try {
        const userId = profile.id;

        const [dtiRes, aasRes, excelRes] = await Promise.all([
          supabase.from('dti_connectors').select('connector_id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('aas_projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('excel_connectors').select('connector_id', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        let dtiAssets = 0;
        if ((dtiRes.count || 0) > 0) {
          const { data: connectors } = await supabase.from('dti_connectors').select('connector_id').eq('user_id', userId);
          if (connectors && connectors.length > 0) {
            const ids = connectors.map(c => c.connector_id);
            const { count } = await supabase.from('dti_assets').select('asset_id', { count: 'exact', head: true }).in('connector_id', ids);
            dtiAssets = count || 0;
          }
        }

        if (!mounted) return;
        setStats({
          dtiConnectors: dtiRes.count || 0,
          dtiAssets,
          aasProjects: aasRes.count || 0,
          excelConnectors: excelRes.count || 0,
        });

        const [dtiItems, aasItems, excelItems] = await Promise.all([
          supabase.from('dti_connectors').select('name, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5),
          supabase.from('aas_projects').select('name, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5),
          supabase.from('excel_connectors').select('name, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(5),
        ]);

        if (!mounted) return;
        const items: ActivityItem[] = [
          ...(dtiItems.data || []).map(d => ({ type: 'dti' as const, name: d.name, updatedAt: d.updated_at })),
          ...(aasItems.data || []).map(d => ({ type: 'aas' as const, name: d.name, updatedAt: d.updated_at })),
          ...(excelItems.data || []).map(d => ({ type: 'excel' as const, name: d.name, updatedAt: d.updated_at })),
        ];
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setActivity(items.slice(0, 10));
      } catch {
        // silently fail — dashboard is non-critical
      }
      if (mounted) setLoading(false);
    })();

    return () => { mounted = false; };
  }, [profile]);

  const typeLabel: Record<string, string> = {
    dti: 'DTI Connector',
    aas: 'AAS Editor',
    excel: 'Excel Connector',
  };

  const typeIcon: Record<string, React.ReactNode> = {
    dti: <Database className="w-3.5 h-3.5 text-accent" />,
    aas: <Hexagon className="w-3.5 h-3.5 text-purple-400" />,
    excel: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />,
  };

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold">
          {greeting()}, {profile?.display_name || 'User'}
        </h1>
        <p className="text-sm text-txt-muted mt-1">{formatDate(new Date())}</p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-bg-surface border border-border rounded p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/10 rounded">
                <Database className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs font-medium text-txt-muted uppercase tracking-wider">DTI Connector</p>
            </div>
            <p className="text-2xl font-mono font-bold">{stats.dtiConnectors}</p>
            <p className="text-xs text-txt-muted mt-1">{stats.dtiConnectors === 1 ? 'Connector' : 'Connectors'} · {stats.dtiAssets} Assets</p>
          </div>

          <div className="bg-bg-surface border border-border rounded p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-400/10 rounded">
                <Hexagon className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-xs font-medium text-txt-muted uppercase tracking-wider">AAS Editor</p>
            </div>
            <p className="text-2xl font-mono font-bold">{stats.aasProjects}</p>
            <p className="text-xs text-txt-muted mt-1">{stats.aasProjects === 1 ? 'Project' : 'Projects'}</p>
          </div>

          <div className="bg-bg-surface border border-border rounded p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-400/10 rounded">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs font-medium text-txt-muted uppercase tracking-wider">Excel Connector</p>
            </div>
            <p className="text-2xl font-mono font-bold">{stats.excelConnectors}</p>
            <p className="text-xs text-txt-muted mt-1">{stats.excelConnectors === 1 ? 'Connector' : 'Connectors'}</p>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-muted mb-3">
          {t('dashboard.activity')}
        </h2>
        <div className="bg-bg-surface border border-border rounded overflow-hidden">
          {activity.length === 0 ? (
            <div className="p-5 text-center">
              <Clock className="w-5 h-5 text-txt-muted mx-auto mb-2" />
              <p className="text-xs text-txt-muted">{t('dashboard.noActivity')}</p>
            </div>
          ) : (
            activity.map((item, i) => (
              <div key={`${item.type}-${item.name}-${i}`}
                className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0">
                <div className="mt-0.5">{typeIcon[item.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-txt-primary truncate">{item.name}</p>
                  <p className="text-2xs text-txt-muted">{typeLabel[item.type]} · {timeAgo(item.updatedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
