import type { FilenameMode } from './lib/filenameMode';

export interface ExcelConnectorSettings {
  valuesMimeType?: boolean;
  // FilenameMode since 09/2026; boolean is the legacy shape still present in stored rows
  valuesFilename?: FilenameMode | boolean;
  documentsMimeType?: boolean;
  documentsFilename?: FilenameMode | boolean;
}

export interface ExcelConnector {
  connector_id: string;
  user_id: string;
  name: string;
  api_key: string;
  excel_path: string | null;
  settings?: ExcelConnectorSettings | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentFile {
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
}

export type ExcelConnectorTab = 'excel' | 'documents' | 'api' | 'settings';
