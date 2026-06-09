export interface AasMcpServer {
  server_id: string;
  user_id: string;
  name: string;
  api_key: string;
  aas_base_url: string | null;
  tool_descriptions: Record<string, string>;
  available_tools: string[];
  enabled_tools: string[] | null;
  created_at: string;
}

export type McpServerTab = 'settings' | 'tools' | 'api';
