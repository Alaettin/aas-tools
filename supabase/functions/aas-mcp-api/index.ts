// AAS MCP Server — Edge Function
// Deploy: supabase functions deploy aas-mcp-api --no-verify-jwt
//
// Endpoint: https://{project-ref}.supabase.co/functions/v1/aas-mcp-api/{apiKey}
// Stands up a generic MCP server (Streamable HTTP, JSON-RPC 2.0 over POST) in front
// of an AAS Repository REST API. The target repo base URL is configured per server
// in the aas_mcp_servers table.
//
// Dynamic discovery (Runde 7): GET {apiKey}/discover fetches {base}/description,
// derives the available tools from the reported AAS-API profiles (SSPs), and persists
// them. tools/list returns only the user-enabled subset. Per-server tool description
// overrides are applied (Runde 2).
//
// Supported JSON-RPC methods: initialize, notifications/initialized, ping,
// tools/list, tools/call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SERVER_NAME = 'aas-mcp-server'
const SERVER_VERSION = '2.0.0'
const DEFAULT_PROTOCOL_VERSION = '2024-11-05'
const INLINE_BINARY_LIMIT = 1024 * 1024 // 1 MB

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// base64url-encode an AAS identifier for use in the URL path (AAS Part 2 spec).
function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

// ---- MCP tool catalog --------------------------------------------------------

type ToolArgs = Record<string, unknown>
type Capability = 'aas' | 'sm' | 'cd'

// AAS-API profile (SSP) substring that enables a capability's tools.
const CAPABILITY_MARKER: Record<Capability, string> = {
  aas: 'AssetAdministrationShellRepositoryServiceSpecification',
  sm: 'SubmodelRepositoryServiceSpecification',
  cd: 'ConceptDescriptionServiceSpecification',
}

interface ToolDef {
  name: string
  description: string
  capability: Capability
  inputSchema: Record<string, unknown>
  binary?: boolean
  buildPath: (args: ToolArgs) => string
}

const ID_PROP = (desc: string) => ({ type: 'string', description: desc })
const PAGE_SCHEMA = {
  type: 'object',
  properties: {
    limit: { type: 'number', description: 'Max number of items to return (optional)' },
    cursor: { type: 'string', description: 'Pagination cursor from a previous response (optional)' },
  },
  required: [] as string[],
}

function pageQuery(a: ToolArgs): string {
  const p = new URLSearchParams()
  if (a.limit !== undefined && a.limit !== null && String(a.limit).trim() !== '') p.set('limit', String(a.limit))
  if (a.cursor) p.set('cursor', String(a.cursor))
  const s = p.toString()
  return s ? `?${s}` : ''
}

const TOOLS: ToolDef[] = [
  {
    name: 'list_shells',
    description: 'List all Asset Administration Shells (paginated).',
    capability: 'aas',
    inputSchema: PAGE_SCHEMA,
    buildPath: (a) => `shells${pageQuery(a)}`,
  },
  {
    name: 'get_shell',
    description: 'Get an Asset Administration Shell by its identifier.',
    capability: 'aas',
    inputSchema: {
      type: 'object',
      properties: { aasIdentifier: ID_PROP('Raw AAS identifier (IRI), e.g. https://example.com/aas/1') },
      required: ['aasIdentifier'],
    },
    buildPath: (a) => `shells/${b64url(String(a.aasIdentifier))}`,
  },
  {
    name: 'get_asset_information',
    description: 'Get the asset information of an Asset Administration Shell.',
    capability: 'aas',
    inputSchema: {
      type: 'object',
      properties: { aasIdentifier: ID_PROP('Raw AAS identifier (IRI)') },
      required: ['aasIdentifier'],
    },
    buildPath: (a) => `shells/${b64url(String(a.aasIdentifier))}/asset-information`,
  },
  {
    name: 'get_thumbnail',
    description: 'Get the thumbnail image of an Asset Administration Shell.',
    capability: 'aas',
    binary: true,
    inputSchema: {
      type: 'object',
      properties: { aasIdentifier: ID_PROP('Raw AAS identifier (IRI)') },
      required: ['aasIdentifier'],
    },
    buildPath: (a) => `shells/${b64url(String(a.aasIdentifier))}/asset-information/thumbnail`,
  },
  {
    name: 'get_submodel_refs',
    description: 'Get all submodel references of an Asset Administration Shell.',
    capability: 'aas',
    inputSchema: {
      type: 'object',
      properties: { aasIdentifier: ID_PROP('Raw AAS identifier (IRI)') },
      required: ['aasIdentifier'],
    },
    buildPath: (a) => `shells/${b64url(String(a.aasIdentifier))}/submodel-refs`,
  },
  {
    name: 'get_submodel_of_shell',
    description: 'Get a specific submodel of an Asset Administration Shell.',
    capability: 'aas',
    inputSchema: {
      type: 'object',
      properties: {
        aasIdentifier: ID_PROP('Raw AAS identifier (IRI)'),
        submodelIdentifier: ID_PROP('Raw submodel identifier (IRI)'),
      },
      required: ['aasIdentifier', 'submodelIdentifier'],
    },
    buildPath: (a) =>
      `shells/${b64url(String(a.aasIdentifier))}/submodels/${b64url(String(a.submodelIdentifier))}`,
  },
  {
    name: 'list_submodels',
    description: 'List all Submodels in the submodel repository (paginated).',
    capability: 'sm',
    inputSchema: PAGE_SCHEMA,
    buildPath: (a) => `submodels${pageQuery(a)}`,
  },
  {
    name: 'get_submodel',
    description: 'Get a submodel by its identifier from the submodel repository.',
    capability: 'sm',
    inputSchema: {
      type: 'object',
      properties: { submodelIdentifier: ID_PROP('Raw submodel identifier (IRI)') },
      required: ['submodelIdentifier'],
    },
    buildPath: (a) => `submodels/${b64url(String(a.submodelIdentifier))}`,
  },
  {
    name: 'get_submodel_element',
    description: 'Get a submodel element by its idShort path within a submodel.',
    capability: 'sm',
    inputSchema: {
      type: 'object',
      properties: {
        submodelIdentifier: ID_PROP('Raw submodel identifier (IRI)'),
        idShortPath: ID_PROP('Dot-separated idShort path, e.g. Documentation.Manual'),
      },
      required: ['submodelIdentifier', 'idShortPath'],
    },
    buildPath: (a) =>
      `submodels/${b64url(String(a.submodelIdentifier))}/submodel-elements/${encodeURIComponent(String(a.idShortPath))}`,
  },
  {
    name: 'get_submodel_element_attachment',
    description: 'Get the file attachment of a submodel element (File / Blob).',
    capability: 'sm',
    binary: true,
    inputSchema: {
      type: 'object',
      properties: {
        submodelIdentifier: ID_PROP('Raw submodel identifier (IRI)'),
        idShortPath: ID_PROP('Dot-separated idShort path to the File element'),
      },
      required: ['submodelIdentifier', 'idShortPath'],
    },
    buildPath: (a) =>
      `submodels/${b64url(String(a.submodelIdentifier))}/submodel-elements/${encodeURIComponent(String(a.idShortPath))}/attachment`,
  },
  {
    name: 'list_concept_descriptions',
    description: 'List all Concept Descriptions (paginated).',
    capability: 'cd',
    inputSchema: PAGE_SCHEMA,
    buildPath: (a) => `concept-descriptions${pageQuery(a)}`,
  },
  {
    name: 'get_concept_description',
    description: 'Get a Concept Description by its identifier.',
    capability: 'cd',
    inputSchema: {
      type: 'object',
      properties: { cdIdentifier: ID_PROP('Raw Concept Description identifier (IRI)') },
      required: ['cdIdentifier'],
    },
    buildPath: (a) => `concept-descriptions/${b64url(String(a.cdIdentifier))}`,
  },
]

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]))
// Backward-compat fallback for servers created before discovery existed.
const ORIGINAL_TOOL_NAMES = [
  'get_shell', 'get_asset_information', 'get_thumbnail', 'get_submodel_refs',
  'get_submodel_of_shell', 'get_submodel', 'get_submodel_element', 'get_submodel_element_attachment',
]

// Derive which tool names are available from the reported AAS-API profiles.
function deriveAvailable(profiles: string[]): string[] {
  const text = profiles.join(' ')
  return TOOLS.filter((t) => text.includes(CAPABILITY_MARKER[t.capability])).map((t) => t.name)
}

function toolListPayload(names: string[], overrides: Record<string, string>) {
  return names
    .map((n) => TOOL_MAP.get(n))
    .filter((t): t is ToolDef => Boolean(t))
    .map((t) => {
      const override = overrides[t.name]
      return {
        name: t.name,
        description: override && override.trim() ? override : t.description,
        inputSchema: t.inputSchema,
      }
    })
}

// ---- Tool execution ----------------------------------------------------------

interface McpContent {
  type: 'text' | 'image'
  text?: string
  data?: string
  mimeType?: string
}

interface ToolResult {
  content: McpContent[]
  isError?: boolean
}

function errorResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

async function executeTool(tool: ToolDef, args: ToolArgs, baseUrl: string): Promise<ToolResult> {
  const required = (tool.inputSchema.required as string[]) || []
  for (const key of required) {
    if (args[key] === undefined || args[key] === null || String(args[key]).trim() === '') {
      return errorResult(`Missing required argument: ${key}`)
    }
  }

  const base = baseUrl.replace(/\/$/, '')
  const targetUrl = `${base}/${tool.buildPath(args)}`

  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: { Accept: tool.binary ? '*/*' : 'application/json' },
    })
  } catch (e) {
    return errorResult(`Upstream fetch failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '')
    return errorResult(`AAS repository returned HTTP ${upstream.status} for ${targetUrl}\n${body.slice(0, 2000)}`)
  }

  const contentType = upstream.headers.get('content-type') || ''

  if (tool.binary) {
    const buf = new Uint8Array(await upstream.arrayBuffer())
    const mime = contentType.split(';')[0].trim() || 'application/octet-stream'
    if (buf.length === 0) return errorResult('AAS repository returned an empty attachment.')
    if (mime.startsWith('image/') && buf.length <= INLINE_BINARY_LIMIT) {
      return { content: [{ type: 'image', data: bytesToBase64(buf), mimeType: mime }] }
    }
    if (buf.length <= INLINE_BINARY_LIMIT) {
      return {
        content: [
          { type: 'text', text: `Attachment (${mime}, ${buf.length} bytes), base64-encoded:` },
          { type: 'text', text: bytesToBase64(buf) },
        ],
      }
    }
    return {
      content: [{
        type: 'text',
        text: `Attachment is ${buf.length} bytes (${mime}), which exceeds the ${INLINE_BINARY_LIMIT}-byte inline limit. Fetch it directly: ${targetUrl}`,
      }],
    }
  }

  const text = await upstream.text()
  if (contentType.includes('application/json')) {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(JSON.parse(text), null, 2) }] }
    } catch {
      // fall through to raw text
    }
  }
  return { content: [{ type: 'text', text }] }
}

// ---- JSON-RPC dispatch -------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

interface ServerCtx {
  baseUrl: string | null
  toolDescriptions: Record<string, string>
  enabledNames: string[]
}

function rpcResult(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

async function handleRpc(
  msg: JsonRpcRequest,
  ctx: ServerCtx,
): Promise<Record<string, unknown> | null> {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize': {
      const requested = (params?.protocolVersion as string) || DEFAULT_PROTOCOL_VERSION
      return rpcResult(id, {
        protocolVersion: requested,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      })
    }

    case 'ping':
      return rpcResult(id, {})

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null

    case 'tools/list':
      return rpcResult(id, { tools: toolListPayload(ctx.enabledNames, ctx.toolDescriptions) })

    case 'tools/call': {
      const name = params?.name as string
      const args = (params?.arguments as ToolArgs) || {}
      const tool = name ? TOOL_MAP.get(name) : undefined
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`)
      if (!ctx.enabledNames.includes(name)) {
        return rpcResult(id, errorResult(`Tool "${name}" is not enabled for this MCP server.`))
      }
      if (!ctx.baseUrl) {
        return rpcResult(id, errorResult('This MCP server has no AAS repository base URL configured.'))
      }
      const result = await executeTool(tool, args, ctx.baseUrl)
      return rpcResult(id, result)
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

// ---- HTTP entrypoint ---------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/aas-mcp-api\//, '').split('/').filter(Boolean)
  const apiKey = parts[0]
  const subPath = parts[1] // e.g. 'discover'

  if (!apiKey || !UUID_RE.test(apiKey)) {
    return json({ error: 'Invalid API key' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: server } = await supabase
    .from('aas_mcp_servers')
    .select('server_id, aas_base_url, tool_descriptions, available_tools, enabled_tools')
    .eq('api_key', apiKey)
    .single()

  if (!server) return json({ error: 'Invalid API key' }, 401)

  const baseUrl: string | null = server.aas_base_url ?? null
  const toolDescriptions: Record<string, string> =
    (server.tool_descriptions as Record<string, string> | null) ?? {}
  const availableTools: string[] = Array.isArray(server.available_tools) ? server.available_tools : []
  const enabledTools: string[] | null = Array.isArray(server.enabled_tools) ? server.enabled_tools : null

  // Effective enabled set: enabled ∩ available; fall back to available; then to the
  // original 8 (for servers created before discovery ran). Always within the catalog.
  let effective = (enabledTools ?? availableTools).filter((n) => TOOL_MAP.has(n))
  if (effective.length === 0) {
    effective = availableTools.length > 0
      ? availableTools.filter((n) => TOOL_MAP.has(n))
      : ORIGINAL_TOOL_NAMES.slice()
  }

  // GET {key}/discover → fetch /description, derive + persist available tools.
  if (req.method === 'GET' && subPath === 'discover') {
    if (!baseUrl) return json({ error: 'No AAS base URL configured' }, 400)
    let profiles: string[] = []
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/description`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return json({ error: `AAS /description returned HTTP ${res.status}` }, 502)
      const desc = await res.json()
      profiles = Array.isArray(desc?.profiles) ? desc.profiles.map((p: unknown) => String(p)) : []
    } catch (e) {
      return json({ error: `Could not reach AAS /description: ${e instanceof Error ? e.message : String(e)}` }, 502)
    }

    const available = deriveAvailable(profiles)
    // Initialise enabled_tools to all-available on first discovery; otherwise keep
    // the user's selection but drop anything no longer available.
    const nextEnabled = enabledTools
      ? enabledTools.filter((n) => available.includes(n))
      : available
    await supabase
      .from('aas_mcp_servers')
      .update({ available_tools: available, enabled_tools: nextEnabled })
      .eq('server_id', server.server_id)

    return json({
      profiles,
      tools: available.map((n) => ({ name: n, description: TOOL_MAP.get(n)?.description ?? '' })),
    })
  }

  // GET (no subpath) → discovery / health response.
  if (req.method === 'GET') {
    return json({
      server: SERVER_NAME,
      version: SERVER_VERSION,
      transport: 'streamable-http',
      configured: Boolean(baseUrl),
      availableTools,
      enabledTools: effective,
      hint: 'POST JSON-RPC 2.0 messages to this URL (initialize, tools/list, tools/call). GET .../discover re-detects tools from the AAS /description.',
    })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(rpcError(null, -32700, 'Parse error'), 200)
  }

  const ctx: ServerCtx = { baseUrl, toolDescriptions, enabledNames: effective }

  if (Array.isArray(body)) {
    const responses: Record<string, unknown>[] = []
    for (const msg of body) {
      const r = await handleRpc(msg as JsonRpcRequest, ctx)
      if (r) responses.push(r)
    }
    if (responses.length === 0) return new Response(null, { status: 202, headers: corsHeaders })
    return json(responses)
  }

  const response = await handleRpc(body as JsonRpcRequest, ctx)
  if (!response) {
    return new Response(null, { status: 202, headers: corsHeaders })
  }
  return json(response)
})
