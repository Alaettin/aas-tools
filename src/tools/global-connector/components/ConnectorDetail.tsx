import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, FileSpreadsheet, FolderOpen, Code, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/fetch-with-timeout';
import { useLocale } from '@/context/LocaleContext';
import type { GlobalConnector, GlobalConnectorTab } from '../types';
import { FileManager } from './FileManager';
import { ApiSettings } from './ApiSettings';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { ConnectorSettings } from './ConnectorSettings';

interface ConnectorDetailProps {
  connectorId: string;
  onBack: () => void;
}

export function ConnectorDetail({ connectorId, onBack }: ConnectorDetailProps) {
  const { t } = useLocale();
  const tabs: { id: GlobalConnectorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'excel', label: t('connector.tabExcel'), icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'documents', label: t('connector.tabDocuments'), icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'api', label: t('connector.tabApi'), icon: <Code className="w-4 h-4" /> },
    { id: 'settings', label: t('connector.tabSettings'), icon: <Settings className="w-4 h-4" /> },
  ];
  const [connector, setConnector] = useState<GlobalConnector | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<GlobalConnectorTab>('excel');
  const [docNames, setDocNames] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('global_connectors').select('*').eq('connector_id', connectorId).single()
        );
        if (!mounted) return;
        if (error || !data) { onBack(); return; }
        setConnector(data as GlobalConnector);

        const c = data as GlobalConnector;
        const { data: files } = await supabase.storage
          .from('global-connectors')
          .list(`${c.user_id}/${c.connector_id}/documents`, { limit: 500 });
        if (mounted && files) {
          setDocNames(files.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => f.name));
        }
      } catch {
        if (mounted) onBack();
      }
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [connectorId, onBack]);

  if (loading || !connector) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const handleApiKeyRegenerate = (newKey: string) => {
    setConnector(prev => prev ? { ...prev, api_key: newKey } : prev);
  };

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <button onClick={onBack}
          className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-3 font-mono">
          <ArrowLeft className="w-3 h-3" />
          Global Connector
        </button>
        <h1 className="font-mono text-2xl font-bold">{connector.name}</h1>
      </div>

      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-accent' : 'text-txt-muted hover:text-txt-primary'
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'excel' && (
          <SpreadsheetEditor excelPath={connector.excel_path} documentNames={docNames} />
        )}
        {activeTab === 'documents' && (
          <FileManager userId={connector.user_id} connectorId={connector.connector_id} />
        )}
        {activeTab === 'api' && (
          <ApiSettings connector={connector} />
        )}
        {activeTab === 'settings' && (
          <ConnectorSettings connector={connector} onApiKeyRegenerate={handleApiKeyRegenerate} />
        )}
      </div>
    </div>
  );
}
