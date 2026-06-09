import { useState } from 'react';
import { Copy, RefreshCw, Check, Key, Link2, Save, Plug } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AasMcpServer } from '../types';
import { validateBaseUrl } from '../lib/validation';
import { useLocale } from '@/context/LocaleContext';
import { mcpEndpointUrl } from '../lib/endpoint';

interface McpServerSettingsProps {
  server: AasMcpServer;
  onApiKeyRegenerate: (newKey: string) => void;
  onBaseUrlChange: (url: string | null) => void;
}

export function McpServerSettings({ server, onApiKeyRegenerate, onBaseUrlChange }: McpServerSettingsProps) {
  const { t } = useLocale();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [baseInput, setBaseInput] = useState(server.aas_base_url ?? '');
  const [baseError, setBaseError] = useState<string | null>(null);
  const [savingBase, setSavingBase] = useState(false);
  const [baseSaved, setBaseSaved] = useState(false);

  const endpoint = mcpEndpointUrl(server.api_key);

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(server.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyEndpoint = async () => {
    await navigator.clipboard.writeText(endpoint);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const newKey = crypto.randomUUID();
    const { error } = await supabase
      .from('aas_mcp_servers')
      .update({ api_key: newKey })
      .eq('server_id', server.server_id);
    if (!error) onApiKeyRegenerate(newKey);
    setRegenerating(false);
    setConfirmRegenerate(false);
  };

  const handleSaveBase = async () => {
    const trimmed = baseInput.trim();
    const err = validateBaseUrl(trimmed);
    if (err) {
      setBaseError(err);
      return;
    }
    setBaseError(null);
    setSavingBase(true);
    const value = trimmed || null;
    const { error } = await supabase
      .from('aas_mcp_servers')
      .update({ aas_base_url: value })
      .eq('server_id', server.server_id);
    setSavingBase(false);
    if (!error) {
      onBaseUrlChange(value);
      setBaseSaved(true);
      setTimeout(() => setBaseSaved(false), 2000);
    } else {
      setBaseError('common.saveFailed');
    }
  };

  const baseDirty = (baseInput.trim() || null) !== (server.aas_base_url ?? null);

  return (
    <div className="space-y-6">
      {/* AAS Repository Base URL */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('mcp.baseUrl')}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
              {t('mcp.baseUrlLabel')}
            </label>
            <input
              type="url"
              value={baseInput}
              onChange={e => { setBaseInput(e.target.value); setBaseError(null); }}
              placeholder="https://aas.example.com/api/v3.0"
              className={`w-full bg-bg-input border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary focus:ring-1 focus:ring-accent/30 transition-colors ${
                baseError ? 'border-red-500/60 focus:border-red-500' : 'border-border focus:border-accent'
              }`}
            />
            {baseError && <p className="text-xs text-red-400 mt-1.5">{baseError}</p>}
            <p className="text-2xs text-txt-muted mt-1.5">{t('mcp.baseUrlHint')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveBase}
              disabled={savingBase || !baseDirty}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
            >
              {savingBase ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common.save')}
            </button>
            {baseSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {t('common.saved')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MCP Endpoint URL */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('mcp.endpoint')}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
              {t('mcp.endpointLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={endpoint}
                readOnly
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary cursor-default break-all"
              />
              <button
                onClick={handleCopyEndpoint}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
                title={t('common.copy')}
              >
                {copiedEndpoint ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
              </button>
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">{t('mcp.endpointHint')}</p>
          </div>
        </div>
      </div>

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
              {t('mcp.apiKeyLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={server.api_key}
                readOnly
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary cursor-default"
              />
              <button
                onClick={handleCopyKey}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
                title={t('common.copy')}
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
              </button>
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">{t('apiKey.hint')}</p>
          </div>

          {!confirmRegenerate ? (
            <button
              onClick={() => setConfirmRegenerate(true)}
              className="flex items-center gap-2 text-sm text-txt-secondary hover:text-txt-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('apiKey.generate')}
            </button>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-3">
              <p className="text-xs text-red-400 mb-3">{t('apiKey.invalidWarning')}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {regenerating ? t('apiKey.regenerating') : t('apiKey.regenerate')}
                </button>
                <button
                  onClick={() => setConfirmRegenerate(false)}
                  className="text-xs text-txt-muted hover:text-txt-primary transition-colors px-3 py-1.5"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
