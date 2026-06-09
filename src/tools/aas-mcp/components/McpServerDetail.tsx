import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Settings, Code, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleContext';
import type { AasMcpServer, McpServerTab } from '../types';
import { McpServerSettings } from './McpServerSettings';
import { McpToolsList } from './McpToolsList';
import { McpDocs } from './McpDocs';

export function McpServerDetail() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const tabs: { id: McpServerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: t('connector.tabSettings'), icon: <Settings className="w-4 h-4" /> },
    { id: 'tools', label: t('mcp.tabTools'), icon: <Wrench className="w-4 h-4" /> },
    { id: 'api', label: t('mcp.tabConnect'), icon: <Code className="w-4 h-4" /> },
  ];
  const [server, setServer] = useState<AasMcpServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<McpServerTab>('settings');

  useEffect(() => {
    if (!serverId) return;
    let mounted = true;

    supabase
      .from('aas_mcp_servers')
      .select('*')
      .eq('server_id', serverId)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data) {
          navigate('/tools/aas-mcp', { replace: true });
          return;
        }
        setServer(data as AasMcpServer);
        setLoading(false);
      })
      .then(undefined, () => {
        if (mounted) navigate('/tools/aas-mcp', { replace: true });
      });

    return () => { mounted = false; };
  }, [serverId, navigate]);

  if (loading || !server) {
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
          onClick={() => navigate('/tools/aas-mcp')}
          className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-3 font-mono"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('mcp.title')}
        </button>
        <h1 className="font-mono text-2xl font-bold">{server.name}</h1>
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
          <McpServerSettings
            server={server}
            onApiKeyRegenerate={newKey => setServer(prev => prev ? { ...prev, api_key: newKey } : prev)}
            onBaseUrlChange={url => setServer(prev => prev ? { ...prev, aas_base_url: url } : prev)}
          />
        )}
        {activeTab === 'tools' && (
          <McpToolsList
            server={server}
            onChange={td => setServer(prev => prev ? { ...prev, tool_descriptions: td } : prev)}
          />
        )}
        {activeTab === 'api' && <McpDocs apiKey={server.api_key} />}
      </div>
    </div>
  );
}
