import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { EvalResult } from '../types';

type EvalStep = 'idle' | 'shell' | 'submodels' | 'evaluating' | 'done' | 'error';

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export function useEvaluation() {
  const { user } = useAuth();
  const [step, setStep] = useState<EvalStep>('idle');
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluate = async (
    sourceId: string,
    baseUrl: string,
    aasId: string,
    useCases: { case_id: string; name: string; description: string | null; submodels: { semantic_id: string; id_short: string | null }[] }[]
  ): Promise<EvalResult | null> => {
    if (!user) return null;
    setStep('shell');
    setResult(null);
    setError(null);

    try {
      // 1. Fetch shell
      const shellUrl = `${baseUrl}/shells/${toBase64Url(aasId)}`;
      const shellRes = await fetchWithTimeout(shellUrl);
      if (!shellRes.ok) {
        throw new Error(`Shell fetch failed: ${shellRes.status}`);
      }
      const shell = await shellRes.json();

      // Extract AAS metadata
      const aasMeta = {
        id: shell.id || aasId,
        idShort: shell.idShort || '',
        assetId: shell.assetInformation?.globalAssetId || '',
        description: shell.description?.[0]?.text || '',
      };

      // Extract submodel references
      const submodelRefs: string[] = (shell.submodels || []).map((ref: any) => {
        if (ref.keys && ref.keys.length > 0) return ref.keys[0].value;
        return null;
      }).filter(Boolean);

      // 2. Fetch submodels
      setStep('submodels');
      const submodelDetails: { id: string; idShort: string; semanticId: string }[] = [];
      const foundSemanticIds = new Set<string>();

      for (const smId of submodelRefs) {
        try {
          const smUrl = `${baseUrl}/submodels/${toBase64Url(smId)}`;
          const smRes = await fetchWithTimeout(smUrl);
          if (smRes.ok) {
            const sm = await smRes.json();
            const semanticId = sm.semanticId?.keys?.[0]?.value || '';
            submodelDetails.push({
              id: sm.id || smId,
              idShort: sm.idShort || '',
              semanticId,
            });
            if (semanticId) foundSemanticIds.add(semanticId);
          }
        } catch {
          // Skip failed submodels
        }
      }

      // 3. Evaluate against use cases
      setStep('evaluating');
      const results = useCases.map(uc => {
        const details = (uc.submodels || []).map(req => ({
          semantic_id: req.semantic_id,
          id_short: req.id_short,
          found: foundSemanticIds.has(req.semantic_id),
        }));
        const passed = details.length > 0 && details.every(d => d.found);
        return {
          case_id: uc.case_id,
          name: uc.name,
          description: uc.description,
          passed,
          details,
        };
      });

      const evalResult: EvalResult = {
        aas_id: aasId,
        aas_meta: aasMeta,
        submodel_count: submodelDetails.length,
        submodel_details: submodelDetails,
        results,
        evaluated_at: new Date().toISOString(),
      };

      // 4. Cache result
      await supabase.from('ucc_evaluations').upsert({
        user_id: user.id,
        aas_id: aasId,
        source_id: sourceId,
        results_json: JSON.stringify(evalResult),
        evaluated_at: evalResult.evaluated_at,
      }, { onConflict: 'user_id,aas_id,source_id' });

      setResult(evalResult);
      setStep('done');
      return evalResult;
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? 'ucc.timeout' : (err.message || 'ucc.evalFailed');
      setError(msg);
      setStep('error');

      // Cache error
      await supabase.from('ucc_evaluations').upsert({
        user_id: user.id,
        aas_id: aasId,
        source_id: sourceId,
        results_json: JSON.stringify({ error: msg }),
        evaluated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,aas_id,source_id' });

      return null;
    }
  };

  const loadCached = async (sourceId: string, aasId: string): Promise<EvalResult | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('ucc_evaluations')
      .select('results_json')
      .eq('user_id', user.id)
      .eq('source_id', sourceId)
      .eq('aas_id', aasId)
      .single();

    if (!data) return null;
    try {
      const parsed = JSON.parse(data.results_json);
      if (parsed.error) { setError(parsed.error); return null; }
      setResult(parsed);
      setStep('done');
      return parsed;
    } catch {
      return null;
    }
  };

  const reset = () => {
    setStep('idle');
    setResult(null);
    setError(null);
  };

  return { step, result, error, evaluate, loadCached, reset };
}
