import * as aas from '@aas-core-works/aas-core3.1-typescript';
import { useAasStore } from '../store/aasStore';
import { convertShell, convertSubmodel, convertConceptDescription } from './convert';

export function exportToJson(): { json: string; errors: string[] } {
  const { shells, submodels, conceptDescriptions } = useAasStore.getState();

  const env = new aas.types.Environment(
    shells.map(convertShell),
    submodels.map(convertSubmodel),
    conceptDescriptions.map(convertConceptDescription),
  );

  const errors: string[] = [];
  try {
    for (const err of aas.verification.verify(env)) {
      errors.push(`${err.path}: ${err.message}`);
    }
  } catch (e) {
    errors.push(`Validierung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
  }

  const jsonable = aas.jsonization.toJsonable(env);
  const json = JSON.stringify(jsonable, null, 2);

  return { json, errors };
}

export function downloadJson(filename: string) {
  const { json } = exportToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
