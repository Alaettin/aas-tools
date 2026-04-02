export interface Connector {
  connector_id: string;
  user_id: string;
  name: string;
  api_key: string;
  created_at: string;
}

export interface HierarchyLevel {
  connector_id: string;
  level: number;
  name: string;
}

export interface ModelDatapoint {
  connector_id: string;
  dp_id: string;
  name: string;
  type: number; // 0 = Property, 1 = File
  sort_order: number;
}

export interface Upload {
  connector_id: string;
  file_id: string;
  original_name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export interface FileEntry {
  connector_id: string;
  entry_id: string;
  en_file_id: string | null;
  de_file_id: string | null;
}

export interface Asset {
  connector_id: string;
  asset_id: string;
}

export interface AssetValue {
  connector_id: string;
  asset_id: string;
  key: string;
  lang: 'en' | 'de';
  value: string;
}

export type ConnectorTab = 'hierarchy' | 'model' | 'files' | 'assets' | 'settings' | 'api';
