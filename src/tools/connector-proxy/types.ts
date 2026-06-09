export interface Proxy {
  proxy_id: string;
  user_id: string;
  name: string;
  api_key: string;
  target_base_url: string | null;
  model_cache_ttl: number;
  files_cache_enabled: boolean;
  files_cache_ttl: number;
  created_at: string;
}

export type ProxyTab = 'settings' | 'filter' | 'values' | 'files' | 'api';

export interface FileRef {
  proxy_id: string;
  item_id: string;
  property_id: string;
  language: string;
  file_hash: string;
  filename: string | null;
  fetched_at: string;
  expires_at: string | null;
  // joined from blob:
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
}

export interface FileCacheStats {
  totalRefs: number;
  uniqueBlobs: number;
  storageBytes: number;
}

export interface Datapoint {
  id: string;
  name: string;
  type: number;
}

export interface ValueEntry {
  propertyId: string;
  value: string;
  valueLanguage?: string;
  needsResolve?: boolean;
  filename?: string;
  name: string;
  type: number;
}
