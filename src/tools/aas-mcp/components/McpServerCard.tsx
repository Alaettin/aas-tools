import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Check, X, Key, Link2 } from 'lucide-react';
import type { AasMcpServer } from '../types';
import { validateServerName } from '../lib/validation';
import { useLocale } from '@/context/LocaleContext';

interface McpServerCardProps {
  server: AasMcpServer;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function McpServerCard({ server, onRename, onDelete }: McpServerCardProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(server.name);
  const [deleting, setDeleting] = useState(false);

  const handleRename = async () => {
    const err = validateServerName(editName);
    if (err) return;
    const ok = await onRename(server.server_id, editName);
    if (ok) setEditing(false);
  };

  const handleDelete = async () => {
    const ok = await onDelete(server.server_id);
    if (!ok) setDeleting(false);
  };

  const date = new Date(server.created_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="bg-bg-surface border border-border rounded p-5 hover:border-border-hover transition-colors group">
      <div className="flex items-start justify-between mb-4">
        {editing ? (
          <div className="flex items-center gap-2 flex-1 mr-2">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setEditing(false); setEditName(server.name); }
              }}
              autoFocus
              className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-1 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <button onClick={handleRename} className="text-emerald-400 hover:text-emerald-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditing(false); setEditName(server.name); }} className="text-txt-muted hover:text-txt-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/tools/aas-mcp/${server.server_id}`)}
            className="text-left flex-1 mr-2"
          >
            <h3 className="font-mono text-sm font-semibold text-txt-primary hover:text-accent transition-colors">
              {server.name}
            </h3>
          </button>
        )}

        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { setEditing(true); setEditName(server.name); }}
              className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm transition-colors"
              title="Umbenennen"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleting(true)}
              className="p-1.5 text-txt-muted hover:text-red-400 hover:bg-bg-elevated rounded-sm transition-colors"
              title={t('common.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/tools/aas-mcp/${server.server_id}`)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2 text-xs text-txt-muted mb-1">
          <Key className="w-3 h-3" />
          <span className="font-mono">{server.api_key.slice(0, 8)}…</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-txt-muted mb-2">
          <Link2 className="w-3 h-3" />
          <span className="font-mono truncate">
            {server.aas_base_url || t('mcp.noBaseUrl')}
          </span>
        </div>
        <p className="text-2xs text-txt-muted">{date}</p>
      </button>

      {deleting && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-txt-secondary mb-3">
            <span className="font-mono font-medium text-txt-primary">{server.name}</span> {t('mcp.deleteConfirm')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-sm py-1.5 transition-colors"
            >
              {t('common.delete')}
            </button>
            <button
              onClick={() => setDeleting(false)}
              className="flex-1 text-xs text-txt-secondary hover:text-txt-primary bg-bg-elevated rounded-sm py-1.5 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
