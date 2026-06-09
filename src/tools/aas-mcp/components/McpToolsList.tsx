import { useState } from 'react';
import { Wrench, Save, RotateCcw, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleContext';
import { MCP_TOOLS, MCP_TOOL_MAP, CAPABILITY_LABEL, type Capability } from '../lib/tools';
import type { AasMcpServer } from '../types';

interface McpToolsListProps {
  server: AasMcpServer;
  onUpdate: (partial: Partial<AasMcpServer>) => void;
}

function ToolRow({ server, toolName, enabled, onToggle, onUpdate }: {
  server: AasMcpServer;
  toolName: string;
  enabled: boolean;
  onToggle: (name: string, next: boolean) => void;
  onUpdate: (partial: Partial<AasMcpServer>) => void;
}) {
  const { t } = useLocale();
  const info = MCP_TOOL_MAP.get(toolName);
  const defaultDescription = info?.description ?? '';
  const override = server.tool_descriptions?.[toolName];
  const effective = override && override.trim() ? override : defaultDescription;
  const [value, setValue] = useState(effective);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isCustom = Boolean(override && override.trim());
  const dirty = value.trim() !== effective.trim();

  const persistDescriptions = async (next: Record<string, string>) => {
    setSaving(true);
    const { error } = await supabase
      .from('aas_mcp_servers')
      .update({ tool_descriptions: next })
      .eq('server_id', server.server_id);
    setSaving(false);
    if (!error) {
      onUpdate({ tool_descriptions: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleSave = async () => {
    const next = { ...(server.tool_descriptions || {}) };
    const trimmed = value.trim();
    if (!trimmed || trimmed === defaultDescription.trim()) delete next[toolName];
    else next[toolName] = trimmed;
    await persistDescriptions(next);
  };

  const handleReset = async () => {
    const next = { ...(server.tool_descriptions || {}) };
    delete next[toolName];
    setValue(defaultDescription);
    await persistDescriptions(next);
  };

  return (
    <div className={`border rounded p-4 bg-bg-surface transition-colors ${enabled ? 'border-border' : 'border-border/50 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onToggle(toolName, e.target.checked)}
          className="accent-accent w-4 h-4 mt-1 flex-shrink-0"
          title={t('mcp.toolEnabled')}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono text-sm font-semibold text-txt-primary">{toolName}</span>
            {isCustom && (
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded border border-accent/30 bg-accent-muted text-accent">
                {t('mcp.customLabel')}
              </span>
            )}
          </div>

          <label className="block text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
            {t('mcp.descriptionLabel')}
          </label>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={2}
            disabled={!enabled}
            className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none resize-y disabled:opacity-50"
          />

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleSave}
              disabled={saving || !dirty || !enabled}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-xs px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t('common.save')}
            </button>
            {isCustom && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt-primary transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('mcp.resetDefault')}
              </button>
            )}
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {t('common.saved')}
              </span>
            )}
          </div>

          <p className="text-2xs font-mono text-txt-muted mt-2">
            <span className="text-emerald-400">→</span> {info?.upstream ?? toolName}
          </p>
        </div>
      </div>
    </div>
  );
}

export function McpToolsList({ server, onUpdate }: McpToolsListProps) {
  const { t } = useLocale();

  // Only tools known to the catalog AND reported available for this repo.
  const available = (server.available_tools || []).filter(n => MCP_TOOL_MAP.has(n));
  const enabledSet = new Set(server.enabled_tools ?? available);

  const handleToggle = async (name: string, next: boolean) => {
    const current = new Set(server.enabled_tools ?? available);
    if (next) current.add(name);
    else current.delete(name);
    const nextList = available.filter(n => current.has(n));
    const { error } = await supabase
      .from('aas_mcp_servers')
      .update({ enabled_tools: nextList })
      .eq('server_id', server.server_id);
    if (!error) onUpdate({ enabled_tools: nextList });
  };

  if (available.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-mono text-lg font-semibold mb-1">{t('mcp.toolsTitle')}</h2>
          <p className="text-sm text-txt-secondary">{t('mcp.toolsSubtitle')}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <Wrench className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('mcp.noToolsDiscovered')}</p>
        </div>
      </div>
    );
  }

  // Group available tools by capability, in catalog order.
  const caps: Capability[] = ['aas', 'sm', 'cd'];
  const grouped = caps
    .map(cap => ({
      cap,
      tools: MCP_TOOLS.filter(tn => tn.capability === cap && available.includes(tn.name)).map(tn => tn.name),
    }))
    .filter(g => g.tools.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1">{t('mcp.toolsTitle')}</h2>
        <p className="text-sm text-txt-secondary">{t('mcp.toolsSubtitle')}</p>
      </div>

      {grouped.map(group => (
        <div key={group.cap} className="space-y-2">
          <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">
            {CAPABILITY_LABEL[group.cap]}
          </p>
          {group.tools.map(name => (
            <ToolRow
              key={name}
              server={server}
              toolName={name}
              enabled={enabledSet.has(name)}
              onToggle={handleToggle}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
