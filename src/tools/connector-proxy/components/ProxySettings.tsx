import { useState } from 'react';
import { Copy, RefreshCw, Check, Key, Link2, Save, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Proxy } from '../types';
import { validateTargetUrl } from '../lib/validation';
import { useLocale } from '@/context/LocaleContext';

interface ProxySettingsProps {
  proxy: Proxy;
  onApiKeyRegenerate: (newKey: string) => void;
  onTargetUrlChange: (url: string | null) => void;
  onCacheTtlChange: (ttl: number) => void;
  onFilesTtlChange: (ttl: number) => void;
}

const CACHE_TTL_OPTIONS = [
  { value: 0, labelKey: 'proxy.cacheOff' },
  { value: 30, labelKey: 'proxy.cache30s' },
  { value: 60, labelKey: 'proxy.cache1m' },
  { value: 300, labelKey: 'proxy.cache5m' },
  { value: 900, labelKey: 'proxy.cache15m' },
  { value: 3600, labelKey: 'proxy.cache1h' },
  { value: 21600, labelKey: 'proxy.cache6h' },
  { value: 86400, labelKey: 'proxy.cache24h' },
] as const;

const FILES_TTL_OPTIONS = [
  { value: 0, labelKey: 'proxy.cacheOff' },
  { value: 3600, labelKey: 'proxy.cache1h' },
  { value: 21600, labelKey: 'proxy.cache6h' },
  { value: 86400, labelKey: 'proxy.cache24h' },
  { value: 604800, labelKey: 'proxy.cache7d' },
  { value: 2592000, labelKey: 'proxy.cache30d' },
] as const;

export function ProxySettings({ proxy, onApiKeyRegenerate, onTargetUrlChange, onCacheTtlChange, onFilesTtlChange }: ProxySettingsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [targetInput, setTargetInput] = useState(proxy.target_base_url ?? '');
  const [targetError, setTargetError] = useState<string | null>(null);
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);
  const [savingTtl, setSavingTtl] = useState(false);
  const [ttlSaved, setTtlSaved] = useState(false);
  const [savingFilesTtl, setSavingFilesTtl] = useState(false);
  const [filesTtlSaved, setFilesTtlSaved] = useState(false);

  const handleTtlChange = async (value: number) => {
    setSavingTtl(true);
    const { error } = await supabase
      .from('connector_proxies')
      .update({ model_cache_ttl: value })
      .eq('proxy_id', proxy.proxy_id);
    setSavingTtl(false);
    if (!error) {
      onCacheTtlChange(value);
      setTtlSaved(true);
      setTimeout(() => setTtlSaved(false), 1500);
    }
  };

  const handleFilesTtlChange = async (value: number) => {
    setSavingFilesTtl(true);
    const { error } = await supabase
      .from('connector_proxies')
      .update({ files_cache_ttl: value })
      .eq('proxy_id', proxy.proxy_id);
    setSavingFilesTtl(false);
    if (!error) {
      onFilesTtlChange(value);
      setFilesTtlSaved(true);
      setTimeout(() => setFilesTtlSaved(false), 1500);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(proxy.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const newKey = crypto.randomUUID();
    const { error } = await supabase
      .from('connector_proxies')
      .update({ api_key: newKey })
      .eq('proxy_id', proxy.proxy_id);
    if (!error) onApiKeyRegenerate(newKey);
    setRegenerating(false);
    setConfirmRegenerate(false);
  };

  const handleSaveTarget = async () => {
    const trimmed = targetInput.trim();
    const err = validateTargetUrl(trimmed);
    if (err) {
      setTargetError(err);
      return;
    }
    setTargetError(null);
    setSavingTarget(true);
    const value = trimmed || null;
    const { error } = await supabase
      .from('connector_proxies')
      .update({ target_base_url: value })
      .eq('proxy_id', proxy.proxy_id);
    setSavingTarget(false);
    if (!error) {
      onTargetUrlChange(value);
      setTargetSaved(true);
      setTimeout(() => setTargetSaved(false), 2000);
    } else {
      setTargetError('common.saveFailed');
    }
  };

  const targetDirty = (targetInput.trim() || null) !== (proxy.target_base_url ?? null);

  return (
    <div className="space-y-6">
      {/* Target Base URL */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('proxy.target')}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
              {t('proxy.targetLabel')}
            </label>
            <input
              type="url"
              value={targetInput}
              onChange={e => { setTargetInput(e.target.value); setTargetError(null); }}
              placeholder="https://xxx.supabase.co/functions/v1/dti-api/abc-123-..."
              className={`w-full bg-bg-input border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary focus:ring-1 focus:ring-accent/30 transition-colors ${
                targetError ? 'border-red-500/60 focus:border-red-500' : 'border-border focus:border-accent'
              }`}
            />
            {targetError && <p className="text-xs text-red-400 mt-1.5">{targetError}</p>}
            <p className="text-2xs text-txt-muted mt-1.5">{t('proxy.targetHint')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveTarget}
              disabled={savingTarget || !targetDirty}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
            >
              {savingTarget ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common.save')}
            </button>
            {targetSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {t('common.saved')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Model Cache TTL */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('proxy.cache')}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
              {t('proxy.cacheLabel')}
            </label>
            <div className="flex items-center gap-3">
              <select
                value={proxy.model_cache_ttl}
                onChange={e => handleTtlChange(Number(e.target.value))}
                disabled={savingTtl}
                className="bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none disabled:opacity-50"
              >
                {CACHE_TTL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</option>
                ))}
              </select>
              {savingTtl && <RefreshCw className="w-4 h-4 text-txt-muted animate-spin" />}
              {ttlSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t('common.saved')}
                </span>
              )}
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">{t('proxy.cacheHint')}</p>
          </div>
        </div>
      </div>

      {/* Files Cache TTL */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-accent" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
              {t('proxy.filesCache')}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
              {t('proxy.filesCacheLabel')}
            </label>
            <div className="flex items-center gap-3">
              <select
                value={proxy.files_cache_ttl}
                onChange={e => handleFilesTtlChange(Number(e.target.value))}
                disabled={savingFilesTtl}
                className="bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none disabled:opacity-50"
              >
                {FILES_TTL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</option>
                ))}
              </select>
              {savingFilesTtl && <RefreshCw className="w-4 h-4 text-txt-muted animate-spin" />}
              {filesTtlSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t('common.saved')}
                </span>
              )}
            </div>
            <p className="text-2xs text-txt-muted mt-1.5">{t('proxy.filesCacheHint')}</p>
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
              {t('proxy.apiKeyLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={proxy.api_key}
                readOnly
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm font-mono text-txt-primary cursor-default"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
                title={t('common.copy')}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
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
