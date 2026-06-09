import { useState } from 'react';
import { Wrench, Save, RotateCcw, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleContext';
import { MCP_TOOLS } from '../lib/tools';
import type { AasMcpServer } from '../types';

interface McpToolsListProps {
  server: AasMcpServer;
  onChange: (toolDescriptions: Record<string, string>) => void;
}

function ToolRow({ server, toolName, defaultDescription, upstream, args, onChange }: {
  server: AasMcpServer;
  toolName: string;
  defaultDescription: string;
  upstream: string;
  args: { name: string; required: boolean; description: string }[];
  onChange: (next: Record<string, string>) => void;
}) {
  const { t } = useLocale();
  const override = server.tool_descriptions?.[toolName];
  const effective = override && override.trim() ? override : defaultDescription;
  const [value, setValue] = useState(effective);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isCustom = Boolean(override && override.trim());
  const dirty = value.trim() !== effective.trim();

  const persist = async (next: Record<string, string>) => {
    setSaving(true);
    const { error } = await supabase
      .from('aas_mcp_servers')
      .update({ tool_descriptions: next })
      .eq('server_id', server.server_id);
    setSaving(false);
    if (!error) {
      onChange(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleSave = async () => {
    const next = { ...(server.tool_descriptions || {}) };
    const trimmed = value.trim();
    if (!trimmed || trimmed === defaultDescription.trim()) {
      delete next[toolName];
    } else {
      next[toolName] = trimmed;
    }
    await persist(next);
  };

  const handleReset = async () => {
    const next = { ...(server.tool_descriptions || {}) };
    delete next[toolName];
    setValue(defaultDescription);
    await persist(next);
  };

  return (
    <div className="border border-border rounded p-4 bg-bg-surface">
      <div className="flex items-center gap-2 mb-2">
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
        className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none resize-y"
      />

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
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

      <div className="flex flex-wrap gap-2 mt-3">
        {args.map(arg => (
          <span
            key={arg.name}
            className="text-2xs font-mono px-2 py-0.5 rounded border border-border bg-bg-input text-txt-secondary"
            title={arg.description}
          >
            {arg.name}{arg.required ? '*' : ''}
          </span>
        ))}
      </div>
      <p className="text-2xs font-mono text-txt-muted mt-2">
        <span className="text-emerald-400">→</span> {upstream}
      </p>
    </div>
  );
}

export function McpToolsList({ server, onChange }: McpToolsListProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1">{t('mcp.toolsTitle')}</h2>
        <p className="text-sm text-txt-secondary">{t('mcp.toolsSubtitle')}</p>
      </div>

      <div className="space-y-2">
        {MCP_TOOLS.map(tool => (
          <ToolRow
            key={tool.name}
            server={server}
            toolName={tool.name}
            defaultDescription={tool.description}
            upstream={tool.upstream}
            args={tool.args}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
