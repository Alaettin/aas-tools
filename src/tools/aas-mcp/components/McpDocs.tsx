import { useState } from 'react';
import { Copy, Check, Play, Loader2 } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { mcpEndpointUrl } from '../lib/endpoint';

interface McpDocsProps {
  apiKey: string;
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="relative">
        <pre className="bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-secondary overflow-x-auto">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-txt-secondary" />}
        </button>
      </div>
    </div>
  );
}

export function McpDocs({ apiKey }: McpDocsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const endpoint = mcpEndpointUrl(apiKey);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      const data = await res.json();
      const count = Array.isArray(data?.result?.tools) ? data.result.tools.length : 0;
      setTestResult({
        ok: res.ok && count > 0,
        text: count > 0
          ? t('mcp.testOk', { count })
          : JSON.stringify(data, null, 2),
      });
    } catch (e) {
      setTestResult({ ok: false, text: String(e) });
    }
    setTesting(false);
  };

  const initExample = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'my-client', version: '1.0.0' } },
  }, null, 2);

  const listExample = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, null, 2);

  const callExample = JSON.stringify({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'get_shell', arguments: { aasIdentifier: 'https://example.com/aas/1' } },
  }, null, 2);

  const clientConfig = JSON.stringify({
    mcpServers: {
      'aas-repository': {
        type: 'http',
        url: endpoint,
      },
    },
  }, null, 2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1">{t('mcp.docsTitle')}</h2>
        <p className="text-sm text-txt-secondary">{t('mcp.docsSubtitle')}</p>
      </div>

      <div className="bg-bg-surface border border-border rounded p-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-2">{t('mcp.endpoint')}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 font-mono text-xs text-txt-primary break-all">
            {endpoint}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
          </button>
        </div>
        <div className="mt-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-xs px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {t('mcp.testConnection')}
          </button>
          {testResult && (
            <div className="mt-2">
              <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded border ${
                testResult.ok
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-red-400 bg-red-400/10 border-red-400/20'
              }`}>
                {testResult.ok ? 'OK' : 'ERR'}
              </span>
              <pre className="mt-1 bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-secondary overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                {testResult.text}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded p-4 space-y-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">{t('mcp.transport')}</p>
        <p className="text-sm text-txt-secondary">{t('mcp.transportDesc')}</p>
        <CodeBlock label={t('mcp.clientConfig')} code={clientConfig} />
      </div>

      <div className="bg-bg-surface border border-border rounded p-4 space-y-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">{t('mcp.examples')}</p>
        <CodeBlock label="initialize" code={initExample} />
        <CodeBlock label="tools/list" code={listExample} />
        <CodeBlock label="tools/call" code={callExample} />
      </div>
    </div>
  );
}
