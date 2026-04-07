import { useEffect } from 'react';
import { ArrowLeft, Download, Box, CheckCircle, XCircle, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useEvaluation } from '../hooks/useEvaluation';
import type { EvalResult, UseCase } from '../types';

type EvalStep = 'idle' | 'shell' | 'submodels' | 'evaluating' | 'done' | 'error';

const STEP_KEYS = [
  { key: 'shell', labelKey: 'ucc.stepShell' as const, icon: Download },
  { key: 'submodels', labelKey: 'ucc.stepSubmodels' as const, icon: Box },
  { key: 'evaluating', labelKey: 'ucc.stepEvaluate' as const, icon: CheckCircle },
];

function StepIndicator({ currentStep }: { currentStep: EvalStep }) {
  const { t } = useLocale();
  const stepOrder = ['shell', 'submodels', 'evaluating', 'done'];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-4 py-8">
      {STEP_KEYS.map((s, i) => {
        const isDone = currentIdx > i || currentStep === 'done';
        const isActive = stepOrder[currentIdx] === s.key;
        const isError = currentStep === 'error' && stepOrder[currentIdx] === s.key;

        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-sm transition-all ${
              isError ? 'bg-red-500/20 text-red-400' :
              isDone ? 'bg-emerald-500/20 text-emerald-400' :
              isActive ? 'bg-accent/20 text-accent' :
              'bg-bg-elevated text-txt-muted'
            }`}>
              {isActive && !isDone ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isDone ? (
                <Check className="w-5 h-5" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <s.icon className="w-5 h-5" />
              )}
            </div>
            <span className={`text-xs font-medium ${
              isActive || isDone ? 'text-txt-primary' : 'text-txt-muted'
            }`}>
              {t(s.labelKey)}
            </span>
            {i < STEP_KEYS.length - 1 && (
              <div className={`w-8 h-px ${isDone ? 'bg-emerald-500/40' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultView({ result }: { result: EvalResult }) {
  const { t } = useLocale();
  return (
    <div className="space-y-6 animate-fade-in">
      {/* AAS Meta */}
      <div className="bg-bg-surface border border-border rounded-sm p-5">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3">{t('ucc.aasInfo')}</h4>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div><span className="text-txt-muted">idShort:</span> <span className="font-mono text-txt-primary">{result.aas_meta.idShort || '—'}</span></div>
          <div><span className="text-txt-muted">ID:</span> <span className="font-mono text-txt-primary text-xs break-all">{result.aas_meta.id}</span></div>
          <div><span className="text-txt-muted">Asset ID:</span> <span className="font-mono text-txt-primary text-xs break-all">{result.aas_meta.assetId || '—'}</span></div>
          <div><span className="text-txt-muted">{t('ucc.description')}:</span> <span className="text-txt-primary">{result.aas_meta.description || '—'}</span></div>
        </div>
      </div>

      {/* Submodels found */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3">
          {t('ucc.submodelsFound')} ({result.submodel_count})
        </h4>
        {result.submodel_details.length === 0 ? (
          <p className="text-sm text-txt-muted">{t('ucc.noSubmodels')}</p>
        ) : (
          <div className="bg-bg-surface border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-2xs text-txt-muted uppercase tracking-wider">idShort</th>
                  <th className="px-4 py-2.5 text-left text-2xs text-txt-muted uppercase tracking-wider">Semantic ID</th>
                </tr>
              </thead>
              <tbody>
                {result.submodel_details.map((sm, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-txt-primary">{sm.idShort}</td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-txt-muted break-all">{sm.semanticId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Use Case Results */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3">
          {t('ucc.useCaseResults')}
        </h4>
        <div className="space-y-3">
          {result.results.map((r, i) => (
            <div key={i} className={`border rounded-sm overflow-hidden ${
              r.passed ? 'border-emerald-500/30' : 'border-red-500/30'
            }`}>
              <div className={`flex items-center gap-2 px-4 py-3 ${
                r.passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {r.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm font-medium text-txt-primary">{r.name}</span>
                <span className={`ml-auto text-2xs font-mono ${r.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="px-4 py-2.5 space-y-1.5">
                {r.details.map((d, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    {d.found ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-txt-secondary">{d.id_short || '—'}</span>
                    <span className="font-mono text-2xs text-txt-muted break-all">{d.semantic_id}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EvalView({ sourceId, baseUrl, aasId, useCases, cachedOnly, onBack }: {
  sourceId: string;
  baseUrl: string;
  aasId: string;
  useCases: UseCase[];
  cachedOnly?: boolean;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const { step, result, error, evaluate, loadCached, reset } = useEvaluation();

  useEffect(() => {
    if (cachedOnly) {
      loadCached(sourceId, aasId);
    } else {
      const ucData = useCases.map(uc => ({
        case_id: uc.case_id,
        name: uc.name,
        description: uc.description,
        submodels: (uc.submodels || []).map(s => ({ semantic_id: s.semantic_id, id_short: s.id_short })),
      }));
      evaluate(sourceId, baseUrl, aasId, ucData);
    }
    return () => reset();
  }, [sourceId, aasId]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-txt-muted hover:text-accent transition-colors font-mono"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('ucc.tabOverview')}
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm font-mono text-txt-primary truncate" title={aasId}>{aasId}</span>
      </div>

      {/* Progress */}
      {step !== 'done' && step !== 'idle' && (
        <div className="bg-bg-surface border border-border rounded-sm mb-6">
          <StepIndicator currentStep={step} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Result */}
      {result && <ResultView result={result} />}
    </div>
  );
}
