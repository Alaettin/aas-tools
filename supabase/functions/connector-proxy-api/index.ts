// Connector Proxy — External API Edge Function
// Deploy: supabase functions deploy connector-proxy-api --no-verify-jwt
//
// Base URL: https://{project-ref}.supabase.co/functions/v1/connector-proxy-api/{apiKey}/...
// Forwards any request 1:1 to the proxy's configured target_base_url.
// Special-cases /model, /Product/:id/values, /Product/:id/documents for blacklist filtering.
// /documents additionally uses Content-Addressable Storage (CAS) when files_cache_enabled=true.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Accept-Language',
}

function err(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const FORWARD_HEADER_WHITELIST = new Set([
  'content-type',
  'accept',
  'accept-language',
  'user-agent',
])

// In-memory cache for /model responses. Scoped per Edge Function instance.
const modelCache = new Map<string, { expiresAt: number; raw: unknown }>()

const STORAGE_BUCKET = 'proxy-file-cache'

type PathType = 'model' | 'values' | 'documents' | null

function detectPath(pathLower: string, method: string): {
  kind: PathType
  itemId: string
} {
  if (method === 'GET' && pathLower === '/model') return { kind: 'model', itemId: '' }
  const m = pathLower.match(/^\/product\/([^/]+)\/(values|documents)$/)
  if (!m) return { kind: null, itemId: '' }
  if (method !== 'POST') return { kind: null, itemId: '' }
  return { kind: m[2] as 'values' | 'documents', itemId: m[1] }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  const arr = new Uint8Array(buf)
  let hex = ''
  for (const b of arr) hex += b.toString(16).padStart(2, '0')
  return hex
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function guessMimeFromFilename(filename?: string): string | null {
  if (!filename) return null
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip',
  }
  return map[ext] ?? 'application/octet-stream'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/connector-proxy-api\//, '').split('/').filter(Boolean)

  if (!parts[0]) return err('Not found', 404)
  const apiKey = parts[0]
  if (!UUID_RE.test(apiKey)) return err('Invalid API key', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: proxy } = await supabase
    .from('connector_proxies')
    .select('proxy_id, target_base_url, model_cache_ttl, files_cache_enabled, files_cache_ttl')
    .eq('api_key', apiKey)
    .single()

  if (!proxy) return err('Invalid API key', 401)
  if (!proxy.target_base_url) return err('Proxy has no target configured', 502)

  const rest = parts.slice(1).join('/')
  const path = '/' + rest
  const pathLower = path.toLowerCase()
  const { kind: pathKind, itemId } = detectPath(pathLower, req.method)

  const targetBase = proxy.target_base_url.replace(/\/$/, '')
  const targetUrl = rest
    ? `${targetBase}/${rest}${url.search}`
    : `${targetBase}${url.search}`

  const forwardHeaders: Record<string, string> = {}
  for (const [k, v] of req.headers) {
    if (FORWARD_HEADER_WHITELIST.has(k.toLowerCase())) {
      forwardHeaders[k] = v
    }
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = hasBody ? await req.arrayBuffer() : undefined

  // /model cache hit path
  const modelTtl = Number(proxy.model_cache_ttl ?? 0)
  if (pathKind === 'model' && modelTtl > 0) {
    const entry = modelCache.get(proxy.proxy_id)
    if (entry && entry.expiresAt > Date.now()) {
      const { data: bl } = await supabase
        .from('connector_proxy_blacklist')
        .select('dp_id')
        .eq('proxy_id', proxy.proxy_id)
      const blSet = new Set<string>((bl || []).map((r: { dp_id: string }) => r.dp_id))
      const filtered = Array.isArray(entry.raw)
        ? (entry.raw as any[]).filter((item: any) => !blSet.has(String(item?.id ?? '')))
        : entry.raw
      return new Response(JSON.stringify(filtered), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Proxy-Cache': 'hit',
          'X-Proxy-Cache-Expires-In': String(Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000))),
        },
      })
    }
  }

  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    })
  } catch (e) {
    return err(`Upstream fetch failed: ${e instanceof Error ? e.message : String(e)}`, 502)
  }

  // Transparent passthrough for non-special paths
  if (pathKind === null) {
    const respHeaders = new Headers()
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (lower === 'content-encoding' || lower === 'transfer-encoding') return
      respHeaders.set(key, value)
    })
    respHeaders.set('Access-Control-Allow-Origin', '*')
    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    })
  }

  // Load blacklist for filtered paths
  const { data: bl } = await supabase
    .from('connector_proxy_blacklist')
    .select('dp_id')
    .eq('proxy_id', proxy.proxy_id)
  const blSet = new Set<string>((bl || []).map((r: { dp_id: string }) => r.dp_id))

  if (!upstream.ok) {
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await upstream.text())
  } catch {
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: { ...corsHeaders },
    })
  }

  // Cache raw /model response
  if (pathKind === 'model' && modelTtl > 0 && Array.isArray(parsed)) {
    modelCache.set(proxy.proxy_id, {
      expiresAt: Date.now() + modelTtl * 1000,
      raw: parsed,
    })
  }

  // Apply blacklist filter
  let filtered: unknown = parsed
  if (Array.isArray(parsed)) {
    if (pathKind === 'model') {
      filtered = parsed.filter((item: any) => !blSet.has(String(item?.id ?? '')))
    } else {
      // values + documents: filter by propertyId
      filtered = parsed.filter((item: any) => !blSet.has(String(item?.propertyId ?? '')))
    }
  }

  // CAS: cache document files after blacklist filtering
  const outHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  }
  if (pathKind === 'model' && modelTtl > 0) outHeaders['X-Proxy-Cache'] = 'miss'

  if (pathKind === 'documents' && proxy.files_cache_enabled && Array.isArray(filtered)) {
    const filesTtl = Number(proxy.files_cache_ttl ?? 0)
    let cached = 0
    for (const item of filtered as any[]) {
      const value = typeof item?.value === 'string' ? item.value : ''
      if (!value) continue
      const propertyId = String(item?.propertyId ?? '')
      if (!propertyId) continue
      const language = String(item?.valueLanguage ?? '')
      const filename = typeof item?.filename === 'string' ? item.filename : null
      try {
        const bytes = base64ToBytes(value)
        if (bytes.length === 0) continue
        const hash = await sha256Hex(bytes)
        const storagePath = `${proxy.proxy_id}/${hash.slice(0, 2)}/${hash}`
        const mime = guessMimeFromFilename(filename ?? undefined) ?? 'application/octet-stream'

        // Check if blob already exists for this proxy
        const { data: existingBlob } = await supabase
          .from('proxy_file_blob')
          .select('file_hash')
          .eq('proxy_id', proxy.proxy_id)
          .eq('file_hash', hash)
          .maybeSingle()

        if (!existingBlob) {
          // Upload bytes to storage (upsert=true is safe — same content, same path)
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, bytes, { contentType: mime, upsert: true })
          if (upErr && !(upErr as any).message?.includes('Duplicate')) {
            // log and skip this item, continue with others
            console.error('storage upload failed', upErr)
            continue
          }
          const { error: blobErr } = await supabase
            .from('proxy_file_blob')
            .upsert({
              proxy_id: proxy.proxy_id,
              file_hash: hash,
              storage_path: storagePath,
              mime_type: mime,
              size_bytes: bytes.length,
              last_accessed_at: new Date().toISOString(),
            }, { onConflict: 'proxy_id,file_hash' })
          if (blobErr) {
            console.error('blob upsert failed', blobErr)
            continue
          }
        } else {
          await supabase
            .from('proxy_file_blob')
            .update({ last_accessed_at: new Date().toISOString() })
            .eq('proxy_id', proxy.proxy_id)
            .eq('file_hash', hash)
        }

        const expiresAt = filesTtl > 0
          ? new Date(Date.now() + filesTtl * 1000).toISOString()
          : null

        await supabase
          .from('proxy_file_ref')
          .upsert({
            proxy_id: proxy.proxy_id,
            item_id: itemId,
            property_id: propertyId,
            language,
            file_hash: hash,
            filename,
            fetched_at: new Date().toISOString(),
            expires_at: expiresAt,
          }, { onConflict: 'proxy_id,item_id,property_id,language' })

        cached++
      } catch (e) {
        console.error('CAS processing failed for', propertyId, e)
      }
    }
    outHeaders['X-Proxy-CAS-Cached'] = String(cached)
  }

  return new Response(JSON.stringify(filtered), {
    status: upstream.status,
    headers: outHeaders,
  })
})
