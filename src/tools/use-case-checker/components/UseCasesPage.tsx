import { useState } from 'react';
import { Plus, Loader2, CheckSquare, Pencil, Trash2, X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useUseCases } from '../hooks/useUseCases';
import type { UseCase } from '../types';

interface SubmodelRow {
  semantic_id: string;
  id_short: string;
}

function UseCaseDialog({ editing, onSave, onClose }: {
  editing: UseCase | null;
  onSave: (name: string, description: string, submodels: SubmodelRow[]) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(editing?.name || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [submodels, setSubmodels] = useState<SubmodelRow[]>(
    editing?.submodels?.map(s => ({ semantic_id: s.semantic_id, id_short: s.id_short || '' })) || []
  );
  const [saving, setSaving] = useState(false);

  const addRow = () => setSubmodels(prev => [...prev, { semantic_id: '', id_short: '' }]);
  const removeRow = (i: number) => setSubmodels(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof SubmodelRow, value: string) => {
    setSubmodels(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const validSubmodels = submodels.filter(s => s.semantic_id.trim());
    await onSave(name, description, validSubmodels);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-bg-primary/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border rounded w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="font-mono text-sm font-semibold">
            {editing ? t('ucc.editUseCase') : t('ucc.newUseCase')}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-2xs text-txt-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. Digital Nameplate"
              className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-2xs text-txt-muted mb-1">Beschreibung</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional"
              className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-sm text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {/* Submodels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-2xs text-txt-muted">{t('ucc.requiredSubmodels')}</label>
              <button
                onClick={addRow}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('ucc.add')}
              </button>
            </div>
            {submodels.length === 0 ? (
              <p className="text-xs text-txt-muted py-2">{t('ucc.noSubmodelsDefined')}</p>
            ) : (
              <div className="space-y-2">
                {submodels.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.semantic_id}
                      onChange={e => updateRow(i, 'semantic_id', e.target.value)}
                      placeholder="Semantic ID (urn:...)"
                      className="flex-1 bg-bg-input border border-border rounded-sm px-2.5 py-1.5 text-xs font-mono text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                    <input
                      type="text"
                      value={row.id_short}
                      onChange={e => updateRow(i, 'id_short', e.target.value)}
                      placeholder="idShort"
                      className="w-32 bg-bg-input border border-border rounded-sm px-2.5 py-1.5 text-xs text-txt-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                    />
                    <button
                      onClick={() => removeRow(i)}
                      className="text-txt-muted hover:text-red-400 transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-txt-muted hover:text-txt-primary transition-colors">
            {t('ucc.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? t('ucc.save') : t('ucc.create')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UseCasesPage() {
  const { t } = useLocale();
  const { useCases, loading, error, createUseCase, updateUseCase, deleteUseCase } = useUseCases();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<UseCase | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setShowDialog(true); };
  const openEdit = (uc: UseCase) => { setEditing(uc); setShowDialog(true); };

  const handleSave = async (name: string, description: string, submodels: SubmodelRow[]) => {
    if (editing) {
      await updateUseCase(editing.case_id, name, description, submodels);
    } else {
      await createUseCase(name, description, submodels);
    }
    setShowDialog(false);
  };

  const handleDelete = async (caseId: string) => {
    setDeleting(caseId);
    await deleteUseCase(caseId);
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-lg font-semibold">{t('ucc.useCases')}</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('ucc.newUseCase')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {useCases.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <CheckSquare className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('ucc.noUseCases')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {useCases.map(uc => (
            <div key={uc.case_id} className="bg-bg-surface border border-border rounded p-5 hover:border-border-hover transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-sky-400" />
                  <h3 className="font-mono text-sm font-semibold">{uc.name}</h3>
                </div>
                <span className="text-2xs font-mono text-txt-muted bg-bg-elevated px-2 py-0.5 rounded-sm">
                  {uc.submodels?.length || 0} Submodels
                </span>
              </div>
              {uc.description && (
                <p className="text-xs text-txt-muted mb-3">{uc.description}</p>
              )}
              {(uc.submodels || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {uc.submodels!.map(sm => (
                    <div key={sm.id} className="bg-bg-elevated px-2 py-0.5 rounded-sm">
                      <span className="text-2xs text-txt-primary">{sm.id_short || '—'}</span>
                      <span className="text-2xs text-txt-muted font-mono ml-1 max-w-[150px] truncate inline-block align-bottom" title={sm.semantic_id}>
                        {sm.semantic_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(uc)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('ucc.edit')}
                </button>
                <button
                  onClick={() => handleDelete(uc.case_id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-red-400 hover:bg-bg-elevated rounded-sm transition-colors"
                >
                  {deleting === uc.case_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <UseCaseDialog
          editing={editing}
          onSave={handleSave}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
