// MCP endpoint URL for an external MCP client (e.g. Claude Desktop, n8n).
// Uses the platform's own origin (reverse-proxied to the Supabase Edge Function
// via the /aas-mcp-api/ location in nginx.conf — and the vite dev proxy locally),
// so clients never see the raw supabase.co domain.
export function mcpEndpointUrl(apiKey: string): string {
  const origin = window.location.origin.replace(/\/$/, '');
  return `${origin}/aas-mcp-api/${apiKey}`;
}
