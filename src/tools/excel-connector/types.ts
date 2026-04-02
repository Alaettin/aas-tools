export interface ExcelConnector {
  connector_id: string;
  user_id: string;
  name: string;
  api_key: string;
  excel_path: string | null;
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
