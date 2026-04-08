import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Network, Table2, FileUp, Box, Settings, Code } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleContext';
import type { Connector, ConnectorTab } from '../types';
import { ConnectorSettings } from './ConnectorSettings';
import { HierarchyEditor } from './HierarchyEditor';
import { ModelEditor } from './ModelEditor';
import { FileManager } from './FileManager';
import { AssetList } from './AssetList';
import { AssetDetail } from './AssetDetail';
import { ApiDocs } from './ApiDocs';

export function ConnectorDetail() {
  const { connectorId } = useParams<{ connectorId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const tabs: { id: ConnectorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'hierarchy', label: t('connector.tabHierarchy'), icon: <Network className="w-4 h-4" /> },
    { id: 'model', label: t('connector.tabModel'), icon: <Table2 className="w-4 h-4" /> },
    { id: 'files', label: t('connector.tabFiles'), icon: <FileUp className="w-4 h-4" /> },
    { id: 'assets', label: t('connector.tabAssets'), icon: <Box className="w-4 h-4" /> },
    { id: 'api', label: t('connector.tabApi'), icon: <Code className="w-4 h-4" /> },
    { id: 'settings', label: t('connector.tabSettings'), icon: <Settings className="w-4 h-4" /> },
  ];
  const [connector, setConnector] = useState<Connector | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ConnectorTab>('hierarchy');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (!connectorId) return;
    let mounted = true;

    supabase
      .from('dti_connectors')
      .select('*')
      .eq('connector_id', connectorId)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data) {
          navigate('/tools/dti-connector', { replace: true });
          return;
        }
        setConnector(data as Connector);
        setLoading(false);
      })
      .then(undefined, () => {
        if (mounted) navigate('/tools/dti-connector', { replace: true });
      });

    return () => { mounted = false; };
  }, [connectorId, navigate]);

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
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tools/dti-connector')}
          className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-3 font-mono"
        >
          <ArrowLeft className="w-3 h-3" />
          SQL Connector
        </button>
        <h1 className="font-mono text-2xl font-bold">{connector.name}</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedAssetId(null); }}
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

      {/* Tab Content */}
      <div>
        {activeTab === 'hierarchy' && (
          <HierarchyEditor connectorId={connector.connector_id} />
        )}
        {activeTab === 'model' && (
          <ModelEditor connectorId={connector.connector_id} />
        )}
        {activeTab === 'files' && (
          <FileManager connectorId={connector.connector_id} userId={connector.user_id} />
        )}
        {activeTab === 'assets' && (
          selectedAssetId ? (
            <AssetDetail
              connectorId={connector.connector_id}
              assetId={selectedAssetId}
              onBack={() => setSelectedAssetId(null)}
            />
          ) : (
            <AssetList
              connectorId={connector.connector_id}
              onSelect={setSelectedAssetId}
            />
          )
        )}
        {activeTab === 'settings' && (
          <ConnectorSettings
            connector={connector}
            onApiKeyRegenerate={handleApiKeyRegenerate}
          />
        )}
        {activeTab === 'api' && (
          <ApiDocs
            apiKey={connector.api_key}
            baseUrl="/dti-api/"
          />
        )}
      </div>
    </div>
  );
}
