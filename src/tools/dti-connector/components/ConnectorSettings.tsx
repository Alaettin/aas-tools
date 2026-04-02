import { useState } from 'react';
import { Copy, RefreshCw, Check, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Connector } from '../types';
import { ImportExport } from './ImportExport';

interface ConnectorSettingsProps {
  connector: Connector;
  onApiKeyRegenerate: (newKey: string) => void;
}

export function ConnectorSettings({ connector, onApiKeyRegenerate }: ConnectorSettingsProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(connector.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const newKey = crypto.randomUUID();

    const { error } = await supabase
      .from('dti_connectors')
      .update({ api_key: newKey })
      .eq('connector_id', connector.connector_id);

    if (!error) {
      onApiKeyRegenerate(newKey);
    }
    setRegenerating(false);
    setConfirmRegenerate(false);
  };

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              API Key
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
              Dein API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={connector.api_key}
                readOnly
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary cursor-default"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
                title="Kopieren"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
              </button>
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">
              Verwende diesen Key für den Zugriff auf die External API.
            </p>
          </div>

          {/* Regenerate */}
          {!confirmRegenerate ? (
            <button
              onClick={() => setConfirmRegenerate(true)}
              className="flex items-center gap-2 text-sm text-txt-secondary hover:text-txt-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Neuen Key generieren
            </button>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-3">
              <p className="text-xs text-red-400 mb-3">
                Der alte Key wird sofort ungültig. Alle Integrationen müssen aktualisiert werden.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {regenerating ? 'Generiere…' : 'Key erneuern'}
                </button>
                <button
                  onClick={() => setConfirmRegenerate(false)}
                  className="text-xs text-txt-muted hover:text-txt-primary transition-colors px-3 py-1.5"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import/Export */}
      <ImportExport connector={connector} />
    </div>
  );
}
