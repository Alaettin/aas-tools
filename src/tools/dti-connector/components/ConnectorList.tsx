import { useState } from 'react';
import { Plus, Loader2, Database } from 'lucide-react';
import { ConnectorCard } from './ConnectorCard';
import { validateConnectorName } from '../lib/validation';
import { useConnectors } from '../hooks/useConnectors';
import { useLocale } from '@/context/LocaleContext';

export function ConnectorList() {
  const { t } = useLocale();
  const { connectors, loading, error, createConnector, renameConnector, deleteConnector } = useConnectors();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    const err = validateConnectorName(newName);
    if (err) {
      setCreateError(err);
      return;
    }
    setCreating(true);
    setCreateError(null);
    const result = await createConnector(newName);
    if (result) setNewName('');
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold">SQL Connector</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Create */}
      <div className="bg-bg-surface border border-border rounded p-4 mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={e => { setNewName(e.target.value); setCreateError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder={t('connector.newPlaceholder')}
            className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('common.create')}
          </button>
        </div>
        {createError && (
          <p className="text-xs text-red-400 mt-2">{createError}</p>
        )}
      </div>

      {/* Grid */}
      {connectors.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <Database className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('connector.noConnectors')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map(c => (
            <ConnectorCard
              key={c.connector_id}
              connector={c}
              onRename={renameConnector}
              onDelete={deleteConnector}
            />
          ))}
        </div>
      )}
    </div>
  );
}
