import { useState, useRef, useMemo } from 'react';
import { Plus, Trash2, Loader2, Upload, ExternalLink, Save, X } from 'lucide-react';
import { useUploads } from '../hooks/useUploads';
import { useFileEntries } from '../hooks/useFileEntries';
import { validateFileId } from '../lib/validation';
import { useLocale } from '@/context/LocaleContext';

interface FileManagerProps {
  connectorId: string;
  userId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FileManager({ connectorId, userId }: FileManagerProps) {
  const { t } = useLocale();
  const {
    uploads, loading: uploadsLoading, error: uploadsError,
    upload, deleteUpload, getFileUrl,
  } = useUploads(connectorId, userId);

  const {
    entries, loading: entriesLoading, saving, error: entriesError, hasChanges,
    addEntry, removeEntry, updateEntry, save,
  } = useFileEntries(connectorId);

  // Upload form
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFileId, setUploadFileId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation for entries
  const entryIdCounts = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach(e => {
      const key = e.entry_id.toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [entries]);

  const hasEntryErrors = entries.some(e => {
    if (!e.entry_id) return true;
    if (validateFileId(e.entry_id)) return true;
    if ((entryIdCounts.get(e.entry_id.toLowerCase()) || 0) > 1) return true;
    return false;
  });

  const canSave = hasChanges && !hasEntryErrors && entries.every(e => e.entry_id.trim());

  const uploadIds = uploads.map(u => u.file_id);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const err = validateFileId(uploadFileId);
    if (err) { setUploadError(err); return; }

    setUploading(true);
    setUploadError(null);
    const ok = await upload(uploadFileId, file);
    if (ok) {
      setUploadFileId('');
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setUploading(false);
  };

  const handleFileClick = async (storagePath: string) => {
    try {
      const url = await getFileUrl(storagePath);
      if (url) window.open(url, '_blank');
    } catch {
      // silently fail
    }
  };

  const loading = uploadsLoading || entriesLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Section 1: Uploads ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-lg font-semibold">Uploads</h2>
            <p className="text-xs text-txt-muted mt-0.5">
              {uploads.length} {uploads.length === 1 ? t('common.file') : t('common.files')}
            </p>
          </div>
        </div>

        {uploadsError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
            {uploadsError}
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <div className="bg-bg-surface border border-accent/30 rounded p-4 mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={uploadFileId}
                onChange={e => { setUploadFileId(e.target.value); setUploadError(null); }}
                placeholder="File-ID (z.B. logo_v2)"
                className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-sm font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                className="flex-1 text-sm text-txt-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border file:border-border file:text-sm file:font-medium file:bg-bg-elevated file:text-txt-primary hover:file:bg-border file:cursor-pointer file:transition-colors"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFileId.trim()}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {t('common.upload')}
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="text-sm text-txt-muted hover:text-txt-primary transition-colors px-2"
              >
                {t('common.cancel')}
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          </div>
        )}

        {/* Uploads Table */}
        {uploads.length === 0 && !showUpload ? (
          <div className="bg-bg-surface border border-border rounded p-6 text-center mb-2">
            <p className="text-sm text-txt-secondary">{t('dti.noFiles')}</p>
          </div>
        ) : uploads.length > 0 && (
          <div className="bg-bg-surface border border-border rounded overflow-hidden mb-2">
            <div className="grid grid-cols-[40px_1fr_1fr_80px_40px] gap-0 border-b border-border px-3 py-2 text-2xs font-medium text-txt-muted uppercase tracking-wider">
              <div className="text-center">#</div>
              <div className="px-2">ID</div>
              <div className="px-2">Datei</div>
              <div className="px-2">Größe</div>
              <div />
            </div>
            {uploads.map((u, i) => (
              <div
                key={u.file_id}
                className="grid grid-cols-[40px_1fr_1fr_80px_40px] gap-0 border-b border-border last:border-0 px-3 py-2 hover:bg-bg-elevated/50 transition-colors items-center group"
              >
                <div className="text-xs font-mono text-txt-muted text-center">{i + 1}</div>
                <div className="px-2 text-sm font-mono text-txt-primary">{u.file_id}</div>
                <div className="px-2">
                  <button
                    onClick={() => handleFileClick(u.storage_path)}
                    className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{u.original_name}</span>
                  </button>
                </div>
                <div className="px-2 text-xs text-txt-muted">{formatSize(u.size)}</div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => deleteUpload(u.file_id)}
                    className="p-1 text-txt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 text-sm text-txt-secondary hover:text-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
            File hochladen
          </button>
        )}
      </div>

      {/* ─── Section 2: Einträge ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-lg font-semibold">Einträge</h2>
            <p className="text-xs text-txt-muted mt-0.5">
              {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'}
            </p>
          </div>
          <button
            onClick={() => save()}
            disabled={!canSave || saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save')}
          </button>
        </div>

        {entriesError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
            {entriesError}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="bg-bg-surface border border-border rounded p-6 text-center mb-2">
            <p className="text-sm text-txt-secondary">{t('dti.noEntries')}</p>
          </div>
        ) : (
          <div className="bg-bg-surface border border-border rounded overflow-hidden mb-2">
            <div className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-0 border-b border-border px-3 py-2 text-2xs font-medium text-txt-muted uppercase tracking-wider">
              <div className="text-center">#</div>
              <div className="px-2">Entry-ID</div>
              <div className="px-2">EN</div>
              <div className="px-2">DE</div>
              <div />
            </div>
            {entries.map((entry, i) => {
              const idErr = entry.entry_id ? validateFileId(entry.entry_id) : null;
              const isDuplicate = entry.entry_id && (entryIdCounts.get(entry.entry_id.toLowerCase()) || 0) > 1;

              return (
                <div
                  key={i}
                  className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-0 border-b border-border last:border-0 px-3 py-1.5 hover:bg-bg-elevated/50 transition-colors items-center group"
                >
                  <div className="text-xs font-mono text-txt-muted text-center">{i + 1}</div>
                  <div className="px-2">
                    <input
                      type="text"
                      value={entry.entry_id}
                      onChange={e => updateEntry(i, 'entry_id', e.target.value)}
                      placeholder="entry_id"
                      className={`w-full bg-transparent text-sm font-mono placeholder:text-txt-muted focus:outline-none ${
                        idErr || isDuplicate ? 'text-red-400' : 'text-txt-primary'
                      }`}
                    />
                    {isDuplicate && <p className="text-2xs text-red-400">Duplikat</p>}
                    {idErr && !isDuplicate && <p className="text-2xs text-red-400">{idErr}</p>}
                  </div>
                  <div className="px-2">
                    <select
                      value={entry.en_file_id}
                      onChange={e => updateEntry(i, 'en_file_id', e.target.value)}
                      className="w-full bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent"
                    >
                      <option value="">—</option>
                      {uploadIds.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="px-2">
                    <select
                      value={entry.de_file_id}
                      onChange={e => updateEntry(i, 'de_file_id', e.target.value)}
                      className="w-full bg-bg-input border border-border rounded-sm px-2 py-1 text-xs text-txt-primary focus:border-accent"
                    >
                      <option value="">—</option>
                      {uploadIds.map(id => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => removeEntry(i)}
                      className="p-1 text-txt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={addEntry}
          className="flex items-center gap-2 text-sm text-txt-secondary hover:text-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
          Eintrag hinzufügen
        </button>
      </div>
    </div>
  );
}
