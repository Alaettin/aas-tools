import { X, Download, Box, CheckCircle, XCircle, Loader2, AlertCircle, Check } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import type { EvalResult } from '../types';

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
    <div className="flex items-center justify-center gap-4 py-6">
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
      <div className="bg-bg-elevated/50 rounded-sm p-4">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3">AAS Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-txt-muted">idShort:</span> <span className="font-mono text-txt-primary">{result.aas_meta.idShort || '—'}</span></div>
          <div><span className="text-txt-muted">ID:</span> <span className="font-mono text-txt-primary text-xs break-all">{result.aas_meta.id}</span></div>
          <div><span className="text-txt-muted">Asset ID:</span> <span className="font-mono text-txt-primary text-xs break-all">{result.aas_meta.assetId || '—'}</span></div>
          <div><span className="text-txt-muted">Description:</span> <span className="text-txt-primary">{result.aas_meta.description || '—'}</span></div>
        </div>
      </div>

      {/* Submodels found */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3">
          Submodels ({result.submodel_count})
        </h4>
        {result.submodel_details.length === 0 ? (
          <p className="text-sm text-txt-muted">{t('ucc.noSubmodels')}</p>
        ) : (
          <div className="bg-bg-surface border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-2xs text-txt-muted">idShort</th>
                  <th className="px-3 py-2 text-left text-2xs text-txt-muted">Semantic ID</th>
                </tr>
              </thead>
              <tbody>
                {result.submodel_details.map((sm, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-txt-primary">{sm.idShort}</td>
                    <td className="px-3 py-2 font-mono text-2xs text-txt-muted break-all">{sm.semanticId}</td>
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
              <div className="px-4 py-2 space-y-1">
                {r.details.map((d, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    {d.found ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <X className="w-3 h-3 text-red-400" />
                    )}
                    <span className="text-txt-muted">{d.id_short || '—'}</span>
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

export function EvalDialog({ step, result, error: errorMsg, onClose }: {
  step: EvalStep;
  result: EvalResult | null;
  error: string | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const isInProgress = step === 'shell' || step === 'submodels' || step === 'evaluating';

  return (
    <div className="fixed inset-0 bg-bg-primary/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
      <div className="bg-bg-surface border border-border rounded w-full max-w-2xl max-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="font-mono text-sm font-semibold">Evaluation</h3>
          <button
            onClick={onClose}
            disabled={isInProgress}
            className="text-txt-muted hover:text-txt-primary transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step !== 'done' && <StepIndicator currentStep={step} />}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400 mt-4">
              {errorMsg}
            </div>
          )}

          {result && <ResultView result={result} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isInProgress}
            className="px-4 py-2 text-sm text-txt-secondary hover:text-txt-primary transition-colors disabled:opacity-30"
          >
            {t('ucc.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
