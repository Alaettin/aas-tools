import { useState } from 'react';
import { Loader2, Play, Eye, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useOverview } from '../hooks/useOverview';
import { useUseCases } from '../hooks/useUseCases';
import { useEvaluation } from '../hooks/useEvaluation';
import { StatusBadge } from './StatusBadge';
import { EvalView } from './EvalView';

interface EvalTarget {
  sourceId: string;
  baseUrl: string;
  aasId: string;
  cachedOnly: boolean;
}

export function OverviewPage() {
  const { t } = useLocale();
  const { items, loading, refresh } = useOverview();
  const { useCases } = useUseCases();
  const evaluation = useEvaluation();
  const [evalTarget, setEvalTarget] = useState<EvalTarget | null>(null);
  const [evaluatingAll, setEvaluatingAll] = useState(false);
  const [evalAllProgress, setEvalAllProgress] = useState({ current: 0, total: 0 });

  const handleEvaluateAll = async () => {
    if (evaluatingAll || items.length === 0) return;
    setEvaluatingAll(true);
    setEvalAllProgress({ current: 0, total: items.length });

    const ucData = useCases.map(uc => ({
      case_id: uc.case_id,
      name: uc.name,
      description: uc.description,
      submodels: (uc.submodels || []).map(s => ({ semantic_id: s.semantic_id, id_short: s.id_short })),
    }));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setEvalAllProgress({ current: i + 1, total: items.length });
      await evaluation.evaluate(item.source_id, item.base_url, item.aas_id, ucData);
      evaluation.reset();
    }

    setEvaluatingAll(false);
    refresh();
  };

  const handleEvaluate = (sourceId: string, baseUrl: string, aasId: string) => {
    setEvalTarget({ sourceId, baseUrl, aasId, cachedOnly: false });
  };

  const handleViewCached = (sourceId: string, baseUrl: string, aasId: string) => {
    setEvalTarget({ sourceId, baseUrl, aasId, cachedOnly: true });
  };

  const handleBack = () => {
    setEvalTarget(null);
    refresh();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Show eval view instead of table
  if (evalTarget) {
    return (
      <EvalView
        sourceId={evalTarget.sourceId}
        baseUrl={evalTarget.baseUrl}
        aasId={evalTarget.aasId}
        useCases={useCases}
        cachedOnly={evalTarget.cachedOnly}
        onBack={handleBack}
      />
    );
  }

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
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-lg font-semibold">Overview</h2>
          <span className="text-2xs font-mono text-txt-muted bg-bg-elevated px-2 py-0.5 rounded-sm">
            {items.length} AAS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm text-sm text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {items.length > 0 && (
            <button
              onClick={handleEvaluateAll}
              disabled={evaluatingAll}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm px-4 py-2 rounded-sm transition-colors disabled:opacity-50"
            >
              {evaluatingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {evalAllProgress.current}/{evalAllProgress.total}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {t('ucc.evaluateAll')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded p-10 text-center">
          <ClipboardCheck className="w-10 h-10 text-txt-muted mx-auto mb-3" />
          <p className="text-sm text-txt-secondary">{t('ucc.noAas')}</p>
          <p className="text-xs text-txt-muted mt-1">{t('ucc.noAasHint')}</p>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">AAS ID</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">{t('ucc.colSource')}</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">{t('ucc.colStatus')}</th>
                <th className="px-4 py-3 text-left text-2xs font-medium text-txt-muted uppercase tracking-wider">{t('ucc.colLastEval')}</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.entry_id} className="border-b border-border last:border-0 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-txt-primary truncate block max-w-[300px]" title={item.aas_id}>
                      {item.aas_id}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-txt-secondary">{item.source_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} passCount={item.pass_count} totalCount={item.total_count} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-txt-muted font-mono">{formatDate(item.last_evaluated)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleEvaluate(item.source_id, item.base_url, item.aas_id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-accent hover:bg-accent-muted rounded-sm transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {t('ucc.evaluate')}
                      </button>
                      {item.last_evaluated && (
                        <button
                          onClick={() => handleViewCached(item.source_id, item.base_url, item.aas_id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-txt-muted hover:text-txt-primary hover:bg-bg-elevated rounded-sm transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
