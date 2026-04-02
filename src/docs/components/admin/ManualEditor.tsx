import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, CheckCircle, BookOpen } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { supabase } from '@/lib/supabase';
import { useDocPages } from '../../hooks/useDocPages';
import { useDocTree } from '../../hooks/useDocTree';
import { PageTreeEditor } from './PageTreeEditor';
import type { Manual } from '../../types';

export function ManualEditor() {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [manual, setManual] = useState<Manual | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { tree, refresh: refreshPages } = useDocPages(manualId);
  const { addPage, deletePage, renamePage, reorderSiblings } = useDocTree(manualId, refreshPages);

  useEffect(() => {
    let mounted = true;
    if (!manualId) return;

    (async () => {
      const { data, error: err } = await supabase
        .from('doc_manuals')
        .select('*')
        .eq('id', manualId)
        .single();

      if (!mounted) return;
      if (err || !data) {
        setError(t('docs.admin.manualNotFound'));
        setLoading(false);
        return;
      }
      const m = data as Manual;
      setManual(m);
      setTitle(m.title);
      setDescription(m.description || '');
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [manualId]);

  const handleSave = async () => {
    if (!manualId || saving) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from('doc_manuals')
      .update({ title, description: description || null })
      .eq('id', manualId);

    setSaving(false);
    if (err) {
      setError(t('docs.admin.saveFailed'));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="animate-fade-in">
        <p className="text-sm text-red-400">{t('docs.admin.manualNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <button
        onClick={() => navigate('/docs/admin')}
        className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors mb-6 font-mono"
      >
        <ArrowLeft className="w-3 h-3" />
        {t('docs.admin.title')}
      </button>

      {/* Manual Header */}
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className={`w-8 h-8 ${manual.icon_color}`} />
        <div className="flex-1">
          <h1 className="font-mono text-xl font-bold">{manual.title}</h1>
          <p className="text-2xs text-txt-muted font-mono">/{manual.slug}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-bg-surface border border-border rounded mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
            {t('docs.admin.metadata')}
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-2xs text-txt-muted mb-1">{t('docs.admin.title_field')}</label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setSaved(false); }}
              className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="block text-2xs text-txt-muted mb-1">{t('docs.admin.description')}</label>
            <input
              type="text"
              value={description}
              onChange={e => { setDescription(e.target.value); setSaved(false); }}
              className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? t('userDetail.saved') : t('userDetail.save')}
          </button>
        </div>
      </div>

      {/* Page Tree */}
      <div className="bg-bg-surface border border-border rounded">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary">
            {t('docs.admin.toc')}
          </h2>
        </div>
        <div className="p-5">
          <PageTreeEditor
            manualId={manualId!}
            tree={tree}
            onAddPage={addPage}
            onDeletePage={deletePage}
            onRenamePage={renamePage}
            onReorderSiblings={reorderSiblings}
          />
        </div>
      </div>
    </div>
  );
}
