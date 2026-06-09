// AAS MCP Server — Edge Function
// Deploy: supabase functions deploy aas-mcp-api --no-verify-jwt
//
// Endpoint: https://{project-ref}.supabase.co/functions/v1/aas-mcp-api/{apiKey}
// Stands up a generic MCP server (Streamable HTTP, JSON-RPC 2.0 over POST) in front
// of an AAS Repository REST API. The target repo base URL is configured per server
// in the aas_mcp_servers table. Exposes the 8 read-only GET endpoints as MCP tools.
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
const SERVER_VERSION = '1.0.0'
const DEFAULT_PROTOCOL_VERSION = '2024-11-05'
// Max upstream binary size returned inline (base64) in an MCP content block.
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

// ---- MCP tool definitions ----------------------------------------------------

type ToolArgs = Record<string, unknown>

interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  binary?: boolean
  // Build the upstream path (relative to the AAS repo base URL) from arguments.
  buildPath: (args: ToolArgs) => string
}

const ID_PROP = (desc: string) => ({ type: 'string', description: desc })

const TOOLS: ToolDef[] = [
  {
    name: 'get_shell',
    description: 'Get an Asset Administration Shell by its identifier.',
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
    name: 'get_submodel',
    description: 'Get a submodel by its identifier from the submodel repository.',
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
]

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]))

function toolListPayload(overrides: Record<string, string> = {}) {
  return TOOLS.map((t) => {
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

async function executeTool(
  tool: ToolDef,
  args: ToolArgs,
  baseUrl: string,
): Promise<ToolResult> {
  // Validate required args are present and non-empty.
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

  // Binary endpoints: return image inline if small image, otherwise describe it.
  if (tool.binary) {
    const buf = new Uint8Array(await upstream.arrayBuffer())
    const mime = contentType.split(';')[0].trim() || 'application/octet-stream'
    if (buf.length === 0) {
      return errorResult('AAS repository returned an empty attachment.')
    }
    if (mime.startsWith('image/') && buf.length <= INLINE_BINARY_LIMIT) {
      return { content: [{ type: 'image', data: bytesToBase64(buf), mimeType: mime }] }
    }
    if (buf.length <= INLINE_BINARY_LIMIT) {
      return {
        content: [
          {
            type: 'text',
            text: `Attachment (${mime}, ${buf.length} bytes), base64-encoded:`,
          },
          { type: 'text', text: bytesToBase64(buf) },
        ],
      }
    }
    return {
      content: [
        {
          type: 'text',
          text: `Attachment is ${buf.length} bytes (${mime}), which exceeds the ${INLINE_BINARY_LIMIT}-byte inline limit. Fetch it directly: ${targetUrl}`,
        },
      ],
    }
  }

  // JSON / text endpoints: return the body as text content.
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

function rpcResult(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

async function handleRpc(
  msg: JsonRpcRequest,
  baseUrl: string | null,
  toolDescriptions: Record<string, string>,
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
      // Notifications carry no id and expect no response body.
      return null

    case 'tools/list':
      return rpcResult(id, { tools: toolListPayload(toolDescriptions) })

    case 'tools/call': {
      const name = params?.name as string
      const args = (params?.arguments as ToolArgs) || {}
      const tool = name ? TOOL_MAP.get(name) : undefined
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`)
      if (!baseUrl) {
        return rpcResult(id, errorResult('This MCP server has no AAS repository base URL configured.'))
      }
      const result = await executeTool(tool, args, baseUrl)
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

  if (!apiKey || !UUID_RE.test(apiKey)) {
    return json({ error: 'Invalid API key' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: server } = await supabase
    .from('aas_mcp_servers')
    .select('server_id, aas_base_url, tool_descriptions')
    .eq('api_key', apiKey)
    .single()

  if (!server) return json({ error: 'Invalid API key' }, 401)

  const baseUrl: string | null = server.aas_base_url ?? null
  const toolDescriptions: Record<string, string> =
    (server.tool_descriptions as Record<string, string> | null) ?? {}

  // GET → simple discovery / health response (not part of MCP, convenience only).
  if (req.method === 'GET') {
    return json({
      server: SERVER_NAME,
      version: SERVER_VERSION,
      transport: 'streamable-http',
      configured: Boolean(baseUrl),
      tools: TOOLS.map((t) => t.name),
      hint: 'POST JSON-RPC 2.0 messages to this URL (initialize, tools/list, tools/call).',
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

  // Support JSON-RPC batch (array) and single message.
  if (Array.isArray(body)) {
    const responses: Record<string, unknown>[] = []
    for (const msg of body) {
      const r = await handleRpc(msg as JsonRpcRequest, baseUrl, toolDescriptions)
      if (r) responses.push(r)
    }
    // Pure-notification batch → 202 with no body.
    if (responses.length === 0) return new Response(null, { status: 202, headers: corsHeaders })
    return json(responses)
  }

  const response = await handleRpc(body as JsonRpcRequest, baseUrl, toolDescriptions)
  if (!response) {
    // Notification → no response body.
    return new Response(null, { status: 202, headers: corsHeaders })
  }
  return json(response)
})
