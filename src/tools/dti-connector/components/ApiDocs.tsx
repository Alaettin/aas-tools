import { useState } from 'react';
import { ChevronRight, Copy, Check, Play, Loader2 } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

interface ApiDocsProps {
  apiKey: string;
  baseUrl: string;
}

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
    method: 'GET',
    path: '/Product/ids',
    summary: 'List all asset IDs',
    description: 'Returns an array of all asset IDs for this connector.',
    responseExample: '["CBL001", "CBL002", "DISH001"]',
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 500, body: '{ "error": "Failed to load product IDs" }' },
    ],
  },
  {
    method: 'GET',
    path: '/Product/hierarchies',
    summary: 'Reserved',
    description: 'Returns an empty array. Reserved for future use.',
    responseExample: '[]',
    errors: [{ status: 401, body: '{ "error": "Invalid API key" }' }],
  },
  {
    method: 'GET',
    path: '/Product/hierarchy/levels',
    summary: 'Get hierarchy levels',
    description: 'Returns all defined hierarchy levels, ordered by level number.',
    responseExample: `[
  { "level": 1, "name": "ProductType" },
  { "level": 2, "name": "Manufacturer" },
  { "level": 3, "name": "Series" }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 500, body: '{ "error": "Failed to load hierarchy levels" }' },
    ],
  },
  {
    method: 'GET',
    path: '/Product/:itemId/hierarchy',
    summary: 'Get asset hierarchy values',
    description: 'Returns the hierarchy level values for a specific asset.',
    pathParams: [{ name: 'itemId', placeholder: 'e.g. CBL001' }],
    responseExample: `[
  { "level": 1, "name": "Electric engineering" },
  { "level": 2, "name": "Cable, wire" },
  { "level": 3, "name": "Energy cable" }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 404, body: '{ "error": "Asset not found" }' },
    ],
  },
  {
    method: 'POST',
    path: '/Product/:itemId/values',
    summary: 'Get property values',
    description: 'Returns property values for a specific asset. Filter by language and property IDs. Image files are returned as Base64 inline. Non-image files return needsResolve: true.',
    pathParams: [{ name: 'itemId', placeholder: 'e.g. CBL001' }],
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
    "propertyId": "dp.color",
    "value": "Red",
    "valueLanguage": "en",
    "needsResolve": false
  },
  {
    "propertyId": "dp.color",
    "value": "Rot",
    "valueLanguage": "de",
    "needsResolve": false
  }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 404, body: '{ "error": "Asset not found" }' },
    ],
  },
  {
    method: 'POST',
    path: '/Product/:itemId/documents',
    summary: 'Get file documents',
    description: 'Returns Base64-encoded file content for requested document properties. Use this to resolve files returned with needsResolve: true from /values.',
    pathParams: [{ name: 'itemId', placeholder: 'e.g. CBL001' }],
    requestBody: `{
  "languages": ["en"],
  "propertyIds": ["ds_pm0202_en_co"]
}`,
    responseExample: `[
  {
    "propertyId": "ds_pm0202_en_co",
    "value": "JVBERi0xLjQ...",
    "filename": "datasheet.pdf",
    "valueLanguage": "en",
    "needsResolve": false
  }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 404, body: '{ "error": "Asset not found" }' },
    ],
  },
  {
    method: 'GET',
    path: '/model',
    summary: 'Get data model',
    description: 'Returns all defined datapoints with their ID, name, and type (0 = Property, 1 = File).',
    responseExample: `[
  { "id": "manufacturer", "name": "Manufacturer", "type": 0 },
  { "id": "datasheet", "name": "Datasheet", "type": 1 }
]`,
    errors: [
      { status: 401, body: '{ "error": "Invalid API key" }' },
      { status: 500, body: '{ "error": "Failed to load model" }' },
    ],
  },
];

function EndpointCard({ endpoint, baseUrl }: { endpoint: Endpoint; baseUrl: string }) {
  const { t } = useLocale();
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

          {/* Path Params */}
          {endpoint.pathParams && (
            <div className="space-y-2">
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider">{t('api.urlParams')}</p>
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

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">{t('api.requestBody')}</p>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={body.split('\n').length}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-primary focus:border-accent resize-none"
              />
            </div>
          )}

          {/* Response Example */}
          <div>
            <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5 text-2xs font-mono">200</span>
                {t('api.response')}
              </span>
            </p>
            <pre className="bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-secondary overflow-x-auto">
              {endpoint.responseExample}
            </pre>
          </div>

          {/* Errors */}
          {endpoint.errors.map(e => (
            <div key={e.status}>
              <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-1">
                <span className={`inline-flex items-center gap-1.5`}>
                  <span className="text-red-400 bg-red-400/10 border border-red-400/20 rounded px-1.5 py-0.5 text-2xs font-mono">{e.status}</span>
                  {t('api.error')}
                </span>
              </p>
              <pre className="bg-bg-input border border-border rounded-sm px-3 py-2 text-xs font-mono text-txt-muted">
                {e.body}
              </pre>
            </div>
          ))}

          {/* Try It */}
          <div className="pt-2 border-t border-border">
            <button
              onClick={handleTry}
              disabled={loading}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-xs px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {t('api.tryIt')}
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

export function ApiDocs({ apiKey, baseUrl }: ApiDocsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const displayUrl = `${window.location.origin}${baseUrl}${apiKey}/`;
  const fullBaseUrl = `${baseUrl}${apiKey}/`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-lg font-semibold mb-1">{t('api.title')}</h2>
        <p className="text-sm text-txt-secondary">{t('api.subtitle.sql')}</p>
      </div>

      {/* Base URL */}
      <div className="bg-bg-surface border border-border rounded p-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-2">{t('api.baseUrl')}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-bg-input border border-border rounded-sm px-3 py-2 font-mono text-xs text-txt-primary break-all">
            {displayUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 bg-bg-elevated hover:bg-border border border-border rounded-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-txt-secondary" />}
          </button>
        </div>
      </div>

      {/* Auth */}
      <div className="bg-bg-surface border border-border rounded p-4">
        <p className="text-2xs font-medium text-txt-muted uppercase tracking-wider mb-2">{t('api.auth')}</p>
        <p className="text-sm text-txt-secondary">
          {t('api.authDesc')}
        </p>
      </div>

      {/* Endpoints */}
      <div>
        <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-txt-secondary mb-3">
          {t('api.endpoints')}
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
