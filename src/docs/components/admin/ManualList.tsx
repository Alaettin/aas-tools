import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, BookOpen, FileText, Code, Wrench, GraduationCap, Loader2 } from 'lucide-react';
import { useLocale, type TranslationKey } from '@/context/LocaleContext';
import { useManuals } from '../../hooks/useManuals';

const ICON_ENTRIES: { value: string; labelKey: TranslationKey; Icon: typeof BookOpen }[] = [
  { value: 'BookOpen', labelKey: 'icon.book', Icon: BookOpen },
  { value: 'FileText', labelKey: 'icon.document', Icon: FileText },
  { value: 'Code', labelKey: 'icon.code', Icon: Code },
  { value: 'Wrench', labelKey: 'icon.tool', Icon: Wrench },
  { value: 'GraduationCap', labelKey: 'icon.tutorial', Icon: GraduationCap },
];

const COLOR_ENTRIES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'text-accent', labelKey: 'color.cyan' },
  { value: 'text-purple-400', labelKey: 'color.purple' },
  { value: 'text-emerald-400', labelKey: 'color.emerald' },
  { value: 'text-amber-400', labelKey: 'color.amber' },
  { value: 'text-rose-400', labelKey: 'color.rose' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function ManualList() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { manuals, loading, error, createManual, deleteManual } = useManuals();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('BookOpen');
  const [iconColor, setIconColor] = useState('text-accent');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    const manual = await createManual(title.trim(), slugify(title.trim()), description.trim() || undefined, icon, iconColor);
    setCreating(false);
    if (manual) {
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setIcon('BookOpen');
      setIconColor('text-accent');
      navigate(`/docs/admin/${manual.id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    await deleteManual(id);
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold">{t('docs.admin.title')}</h1>
          <p className="text-sm text-txt-muted mt-1">{t('docs.admin.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2.5 rounded-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('docs.admin.newManual')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="bg-bg-surface border border-border rounded mb-6 p-5">
          <h3 className="font-mono text-sm font-semibold mb-4">{t('docs.admin.createManual')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-2xs text-txt-muted mb-1">{t('docs.admin.title_field')}</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('docs.admin.titlePlaceholder')}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-2xs text-txt-muted mb-1">{t('docs.admin.description')}</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('docs.admin.descriptionPlaceholder')}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-2xs text-txt-muted mb-1">{t('docs.admin.icon')}</label>
                <select
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  className="bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                >
                  {ICON_ENTRIES.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-2xs text-txt-muted mb-1">{t('docs.admin.color')}</label>
                <select
                  value={iconColor}
                  onChange={e => setIconColor(e.target.value)}
                  className="bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                >
                  {COLOR_ENTRIES.map(opt => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('docs.admin.create')}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="text-sm text-txt-muted hover:text-txt-primary px-4 py-2 transition-colors"
              >
                {t('docs.admin.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Grid */}
      {manuals.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-12 text-center">
          <BookOpen className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-muted">{t('docs.admin.noManuals')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manuals.map(manual => {
            const iconEntry = ICON_ENTRIES.find(o => o.value === manual.icon);
            const IconComp = iconEntry?.Icon || BookOpen;
            return (
              <div
                key={manual.id}
                onClick={() => navigate(`/docs/admin/${manual.id}`)}
                className="bg-bg-surface border border-border rounded p-5 cursor-pointer hover:border-border-hover transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <IconComp className={`w-6 h-6 ${manual.icon_color}`} />
                  <button
                    onClick={e => handleDelete(e, manual.id)}
                    className="opacity-0 group-hover:opacity-100 text-txt-muted hover:text-red-400 transition-all p-1"
                    title={t('docs.admin.delete')}
                  >
                    {deleting === manual.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <h3 className="font-mono text-sm font-semibold mb-1">{manual.title}</h3>
                {manual.description && (
                  <p className="text-2xs text-txt-muted">{manual.description}</p>
                )}
                <p className="text-2xs text-txt-muted mt-2 font-mono">
                  /{manual.slug}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
