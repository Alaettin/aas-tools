import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Settings, Code, Filter, Eye, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleContext';
import type { Proxy, ProxyTab } from '../types';
import { ProxySettings } from './ProxySettings';
import { ApiDocs } from './ApiDocs';
import { ModelFilter } from './ModelFilter';
import { ValuesViewer } from './ValuesViewer';
import { FileCacheTab } from './FileCacheTab';

export function ProxyDetail() {
  const { proxyId } = useParams<{ proxyId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const tabs: { id: ProxyTab; label: string; icon: React.ReactNode }[] = [
    { id: 'filter', label: t('proxy.tabFilter'), icon: <Filter className="w-4 h-4" /> },
    { id: 'values', label: t('proxy.tabValues'), icon: <Eye className="w-4 h-4" /> },
    { id: 'files', label: t('proxy.tabFiles'), icon: <Database className="w-4 h-4" /> },
    { id: 'api', label: t('connector.tabApi'), icon: <Code className="w-4 h-4" /> },
    { id: 'settings', label: t('connector.tabSettings'), icon: <Settings className="w-4 h-4" /> },
  ];
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProxyTab>('filter');

  useEffect(() => {
    if (!proxyId) return;
    let mounted = true;

    supabase
      .from('connector_proxies')
      .select('*')
      .eq('proxy_id', proxyId)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data) {
          navigate('/tools/connector-proxy', { replace: true });
          return;
        }
        setProxy(data as Proxy);
        setLoading(false);
      })
      .then(undefined, () => {
        if (mounted) navigate('/tools/connector-proxy', { replace: true });
      });

    return () => { mounted = false; };
  }, [proxyId, navigate]);

  if (loading || !proxy) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => navigate('/tools/connector-proxy')}
          className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-3 font-mono"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('proxy.title')}
        </button>
        <h1 className="font-mono text-2xl font-bold">{proxy.name}</h1>
      </div>

      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-accent'
                : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'settings' && (
          <ProxySettings
            proxy={proxy}
            onApiKeyRegenerate={newKey => setProxy(prev => prev ? { ...prev, api_key: newKey } : prev)}
            onTargetUrlChange={url => setProxy(prev => prev ? { ...prev, target_base_url: url } : prev)}
            onCacheTtlChange={ttl => setProxy(prev => prev ? { ...prev, model_cache_ttl: ttl } : prev)}
            onFilesTtlChange={ttl => setProxy(prev => prev ? { ...prev, files_cache_ttl: ttl } : prev)}
          />
        )}
        {activeTab === 'filter' && (
          <ModelFilter proxy={proxy} />
        )}
        {activeTab === 'values' && (
          <ValuesViewer proxy={proxy} />
        )}
        {activeTab === 'files' && (
          <FileCacheTab
            proxy={proxy}
            onEnabledChange={enabled => setProxy(prev => prev ? { ...prev, files_cache_enabled: enabled } : prev)}
          />
        )}
        {activeTab === 'api' && (
          <ApiDocs apiKey={proxy.api_key} baseUrl="/connector-proxy-api/" />
        )}
      </div>
    </div>
  );
}
