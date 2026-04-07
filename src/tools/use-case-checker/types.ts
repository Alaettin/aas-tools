export interface Source {
  source_id: string;
  user_id: string;
  name: string;
  base_url: string;
  created_at: string;
  aas_count?: number;
}

export interface AasEntry {
  entry_id: string;
  source_id: string;
  aas_id: string;
}

export interface UseCase {
  case_id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  submodels?: RequiredSubmodel[];
}

export interface RequiredSubmodel {
  id: string;
  case_id: string;
  semantic_id: string;
  id_short: string | null;
}

export interface OverviewItem {
  entry_id: string;
  aas_id: string;
  source_id: string;
  source_name: string;
  base_url: string;
  last_evaluated: string | null;
  pass_count: number | null;
  total_count: number | null;
  status: 'pending' | 'pass' | 'fail' | 'partial' | 'error';
  error?: string | null;
}

export interface EvalResult {
  aas_id: string;
  aas_meta: {
    id: string;
    idShort: string;
    assetId: string;
    description: string;
  };
  submodel_count: number;
  submodel_details: {
    id: string;
    idShort: string;
    semanticId: string;
  }[];
  results: {
    case_id: string;
    name: string;
    description: string | null;
    passed: boolean;
    details: {
      semantic_id: string;
      id_short: string | null;
      found: boolean;
    }[];
  }[];
  evaluated_at: string;
}

export interface CachedEvaluation {
  eval_id: string;
  user_id: string;
  aas_id: string;
  source_id: string;
  results_json: string;
  evaluated_at: string;
}
