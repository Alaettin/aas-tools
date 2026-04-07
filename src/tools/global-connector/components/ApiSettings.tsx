import { useState } from 'react';
import { ChevronRight, Copy, Check, Play, Loader2 } from 'lucide-react';
import type { GlobalConnector } from '../types';

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description: string;
  pathParams?: { name: string; placeholder: string }[];
  requestBody?: string;
  responseExample: string;
  errors: { status: number; body: string }[];
}

const endpoints: Endpoint[] = [
  {
    method: 'POST',
    path: '/Product/:itemId/values',
    summary: 'Get property values',
    description: 'Returns property values. The itemId is ignored — always returns the GLOBAL column values.',
    pathParams: [{ name: 'itemId', placeholder: 'any value' }],
    requestBody: `{
  "propertiesWithLanguage": {
    "languages": ["en", "de"],
    "propertyIds": []
  },
  "propertiesWithoutLanguage": {
    "propertyIds": []
  }
}`,
    responseExample: `[
  {
    "propertyId": "EN:ProductName",
    "value": "Product A",
    "valueLanguage": "en",
    "needsResolve": false
  },
  {
    "propertyId": "DE:ProductName",
    "value": "Produkt A",
    "valueLanguage": "de",
    "needsResolve": false
  }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
    ],
  },
  {
    method: 'POST',
    path: '/Product/:itemId/documents',
    summary: 'Get file documents',
    description: 'Returns document files. The itemId is ignored — always returns the GLOBAL column values.',
    pathParams: [{ name: 'itemId', placeholder: 'any value' }],
    requestBody: `{
  "languages": ["en", "de"],
  "propertyIds": []
}`,
    responseExample: `[
  {
    "propertyId": "EN:ProductImage",
    "value": "JVBERi0xLjQ...",
    "mimeType": "image/png",
    "filename": "product_a",
    "valueLanguage": "en",
    "needsResolve": false
  }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
    ],
  },
  {
    method: 'GET',
    path: '/model',
    summary: 'Get data model',
    description: 'Returns all defined datapoints with their ID, name, and type (0 = Property, 1 = Document).',
    responseExample: `[
  { "id": "ProductName", "name": "ProductName", "type": 0 },
  { "id": "SerialNumber", "name": "SerialNumber", "type": 0 },
  { "id": "ProductImage", "name": "ProductImage", "type": 1 }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 500, body: '{ "error": "Internal server error" }' },
    ],
  },
];

function EndpointCard({ endpoint, baseUrl }: { endpoint: Endpoint; baseUrl: string }) {
  const [open, setOpen] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState(endpoint.requestBody || '');
  const [result, setResult] = useState<{ status: number; data: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const methodClass = endpoint.method === 'GET'
    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    : 'text-blue-400 bg-blue-400/10 border-blue-400/20';

  const buildUrl = () => {
    let path = endpoint.path;
    for (const p of endpoint.pathParams || []) {
      path = path.replace(`:${p.name}`, paramValues[p.name] || p.placeholder);
    }
    return baseUrl + path.replace(/^\//, '');
  };

  const handleTry = async () => {
    setLoading(true);
    setResult(null);
    try {
      const url = buildUrl();
      const opts: RequestInit = { method: endpoint.method, headers: {} };
      if (endpoint.method === 'POST') {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = body;
      }
      const res = await fetch(url, opts);
      const data = await res.text();
      try {
        setResult({ status: res.status, data: JSON.stringify(JSON.parse(data), null, 2) });
      } catch {
        setResult({ status: res.status, data });
      }
    } catch (e) {
      setResult({ status: 0, data: String(e) });
    }
    setLoading(false);
  };

  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated/50 transition-colors text-left"
      >
        <ChevronRight className={`w-4 h-4 text-txt-muted transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded border ${methodClass}`}>
          {endpoint.method}
        </span>
        <span className="text-sm font-mono text-txt-primary">{endpoint.path}</span>
        <span className="text-xs text-txt-muted ml-auto">{endpoint.summary}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-bg-surface/50">
          <p className="text-sm text-txt-secondary">{endpoint.description}</p>

          {endpoint.pathParams && (
            <div className="space-y-2">
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">URL Parameters</p>
              {endpoint.pathParams.map(p => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-txt-secondary w-20">{p.name}</span>
                  <input
                    type="text"
                    value={paramValues[p.name] || ''}
                    onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.placeholder}
                    className="flex-1 bg-bg-input border border-border rounded-sm px-2 py-1 text-xs font-mono text-txt-primary placeholder:text-txt-muted focus:border-accent"
                  />
                </div>
              ))}
            </div>
          )}

          {endpoint.requestBody && (
            <div>
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">Request Body</p>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={body.split('\n').length}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-primary focus:border-accent resize-none"
              />
            </div>
          )}

          <div>
            <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 text-2xs font-mono">200</span>
                Response
              </span>
            </p>
            <pre className="bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-secondary overflow-x-auto">
              {endpoint.responseExample}
            </pre>
          </div>

          {endpoint.errors.map(e => (
            <div key={e.status}>
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-red-400 bg-red-400/10 border border-red-400/20 rounded px-1.5 py-0.5 text-2xs font-mono">{e.status}</span>
                  Error
                </span>
              </p>
              <pre className="bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-muted">
                {e.body}
              </pre>
            </div>
          ))}

          <div className="pt-2 border-t border-border">
            <button
              onClick={handleTry}
              disabled={loading}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-xs px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Try it
            </button>

            {result && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded border ${
                    result.status >= 200 && result.status < 300
                      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                      : 'text-red-400 bg-red-400/10 border-red-400/20'
                  }`}>
                    {result.status || 'ERR'}
                  </span>
                  <span className="text-2xs text-txt-muted font-mono">{endpoint.method} {window.location.origin}{buildUrl()}</span>
                </div>
                <pre className="bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-secondary overflow-x-auto max-h-64 overflow-y-auto">
                  {result.data}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiSettings({ connector }: { connector: GlobalConnector }) {
  const [copied, setCopied] = useState(false);

  const displayUrl = `${window.location.origin}/global-api/${connector.api_key}/`;
  const fullBaseUrl = `/global-api/${connector.api_key}/`;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1">API Documentation</h2>
        <p className="text-sm text-txt-secondary">Public REST API for the Global Connector. The itemId parameter is ignored — all endpoints return the GLOBAL column values.</p>
      </div>

      <div className="bg-bg-surface border border-border rounded p-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-2">Base URL</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 font-mono text-xs text-txt-primary break-all">
            {displayUrl}
          </div>
          <button onClick={handleCopyUrl}
            className="flex-shrink-0 p-2 bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
          </button>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded p-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-2">Authentication</p>
        <p className="text-sm text-txt-secondary">
          API Key wird als Path-Parameter in der URL übergeben. Kein Authorization Header nötig.
        </p>
      </div>

      <div>
        <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary mb-3">
          Endpoints
        </h3>
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <EndpointCard key={i} endpoint={ep} baseUrl={fullBaseUrl} />
          ))}
        </div>
      </div>
    </div>
  );
}
