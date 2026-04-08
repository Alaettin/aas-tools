import { useState, useRef } from 'react';
import { Trash2, Loader2, ExternalLink, Upload, FileText, Image, Copy, Check } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { useLocale } from '@/context/LocaleContext';

interface FileManagerProps {
  userId: string;
  connectorId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImage(name: string): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name);
}

export function FileManager({ userId, connectorId }: FileManagerProps) {
  const { t } = useLocale();
  const { documents, loading, error, uploadFile, deleteFile, getFileUrl } = useDocuments(userId, connectorId);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleFileClick = async (storagePath: string) => {
    try {
      const url = await getFileUrl(storagePath);
      if (url) window.open(url, '_blank');
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-lg font-semibold">Documents</h2>
          <p className="text-xs text-txt-muted mt-0.5">{documents.length} {documents.length === 1 ? t('common.file') : t('common.files')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">{error}</div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded p-6 mb-4 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-border-hover'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 text-txt-muted mx-auto mb-2" />
        <p className="text-sm text-txt-secondary">
          {uploading ? t('common.uploading') : t('common.dropOrClick')}
        </p>
      </div>
      <input ref={fileInputRef} type="file" multiple className="hidden"
        onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />

      {/* File List */}
      {documents.length > 0 && (
        <div className="bg-bg-surface border border-border rounded overflow-hidden">
          {documents.map(doc => (
            <div key={doc.name}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-bg-elevated/50 transition-colors group">
              {isImage(doc.name) ? (
                <Image className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-txt-muted flex-shrink-0" />
              )}
              <button onClick={() => handleFileClick(doc.storagePath)}
                className="flex-1 text-left text-sm font-mono text-txt-primary hover:text-accent transition-colors truncate">
                {doc.name}
              </button>
              <button onClick={async () => {
                  await navigator.clipboard.writeText(doc.name);
                  setCopiedName(doc.name);
                  setTimeout(() => setCopiedName(null), 2000);
                }}
                className="p-1 text-txt-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                title={t('common.copy')}>
                {copiedName === doc.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span className="text-2xs text-txt-muted flex-shrink-0">{formatSize(doc.size)}</span>
              <button onClick={() => handleFileClick(doc.storagePath)}
                className="p-1 text-txt-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                title={t('common.open')}>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteFile(doc.name)}
                className="p-1 text-txt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title={t('common.delete')}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
