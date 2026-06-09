// DTI Connector — External API Edge Function
// Deploy: supabase functions deploy dti-api --no-verify-jwt
//
// Base URL: https://{project-ref}.supabase.co/functions/v1/dti-api/v1/{apiKey}/...
//
// File handling: Files werden als base64 inline geliefert (Default). Mit ?urls=1
// (oder Body returnUrls:true) kommen stattdessen Signed URLs (TTL 300s) zurück
// (isUrl:true) → vermeidet riesige Payloads bei großen Dateien. (analog excel-api)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status: number) {
  return json({ error: message }, status)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
    binary += String.fromCharCode.apply(null, sub as unknown as number[])
  }
  return btoa(binary)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/dti-api\//, '').split('/').filter(Boolean)

  // Parse: {apiKey}/... or v1/{apiKey}/... (legacy)
  let apiKeyIndex = 0
  if (parts[0] === 'v1') apiKeyIndex = 1
  if (!parts[apiKeyIndex]) return err('Not found', 404)
  const apiKey = parts[apiKeyIndex]
  if (!UUID_RE.test(apiKey)) return err('Invalid API key', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Resolve API key
  const { data: conn } = await supabase
    .from('dti_connectors')
    .select('connector_id, user_id')
    .eq('api_key', apiKey)
    .single()

  if (!conn) return err('Invalid API key', 401)
  const cid = conn.connector_id

  const path = '/' + parts.slice(apiKeyIndex + 1).join('/')
  const pathLower = path.toLowerCase()
  const method = req.method

  // ?urls=1 → Files als signedUrl statt base64 (massive Egress-/Payload-Ersparnis)
  const returnUrls = url.searchParams.get('urls') === '1'

  try {
    // GET /Product/ids
    if (method === 'GET' && pathLower === '/product/ids') {
      const { data } = await supabase
        .from('dti_assets')
        .select('asset_id')
        .eq('connector_id', cid)
        .order('asset_id')
      return json((data || []).map((d: any) => d.asset_id))
    }

    // GET /Product/hierarchies
    if (method === 'GET' && pathLower === '/product/hierarchies') {
      return json([])
    }

    // GET /Product/hierarchy/levels
    if (method === 'GET' && pathLower === '/product/hierarchy/levels') {
      const { data } = await supabase
        .from('dti_hierarchy_levels')
        .select('level, name')
        .eq('connector_id', cid)
        .order('level')
      return json(data || [])
    }

    // GET /Product/:itemId/hierarchy
    const hierMatch = path.match(/^\/product\/([^/]+)\/hierarchy$/i)
    if (method === 'GET' && hierMatch) {
      const itemId = decodeURIComponent(hierMatch[1])

      const { data: asset } = await supabase
        .from('dti_assets')
        .select('asset_id')
        .eq('connector_id', cid)
        .eq('asset_id', itemId)
        .single()
      if (!asset) return err('Asset not found', 404)

      const { data: levels } = await supabase
        .from('dti_hierarchy_levels')
        .select('level, name')
        .eq('connector_id', cid)
        .order('level')

      const levelNames = (levels || []).map((l: any) => l.name)
      const { data: values } = await supabase
        .from('dti_asset_values')
        .select('key, value')
        .eq('connector_id', cid)
        .eq('asset_id', itemId)
        .eq('lang', 'en')
        .in('key', levelNames)

      const valMap = new Map((values || []).map((v: any) => [v.key, v.value]))
      const result = (levels || []).map((l: any) => ({
        level: l.level,
        name: valMap.get(l.name) || '',
      }))
      return json(result)
    }

    // POST /Product/:itemId/values
    const valMatch = path.match(/^\/product\/([^/]+)\/values$/i)
    if (method === 'POST' && valMatch) {
      const itemId = decodeURIComponent(valMatch[1])

      const { data: asset } = await supabase
        .from('dti_assets')
        .select('asset_id')
        .eq('connector_id', cid)
        .eq('asset_id', itemId)
        .single()
      if (!asset) return err('Asset not found', 404)

      // Get model datapoints
      const { data: model } = await supabase
        .from('dti_model_datapoints')
        .select('dp_id, name, type')
        .eq('connector_id', cid)

      const typeMap: Record<string, number> = {}
      const modelKeys = new Set<string>()
      for (const m of (model || [])) {
        typeMap[m.dp_id] = m.type
        modelKeys.add(m.dp_id)
      }

      // Get all asset values
      const { data: allValues } = await supabase
        .from('dti_asset_values')
        .select('key, lang, value')
        .eq('connector_id', cid)
        .eq('asset_id', itemId)

      // Group values by key
      const byKey: Record<string, any[]> = {}
      for (const r of (allValues || [])) {
        if (!modelKeys.has(r.key)) continue
        if (!byKey[r.key]) byKey[r.key] = []
        byKey[r.key].push(r)
      }

      // Get file entries + uploads for file resolution
      const { data: fileEntries } = await supabase
        .from('dti_file_entries')
        .select('entry_id, en_file_id, de_file_id')
        .eq('connector_id', cid)

      const entryMap = new Map((fileEntries || []).map((e: any) => [e.entry_id, e]))

      const { data: uploads } = await supabase
        .from('dti_uploads')
        .select('file_id, original_name, mime_type, storage_path')
        .eq('connector_id', cid)

      const uploadMap = new Map((uploads || []).map((u: any) => [u.file_id, u]))

      // Helper: download file and return base64. Returns null if missing.
      async function readFileBase64(storagePath: string): Promise<string | null> {
        const { data: fileData } = await supabase.storage
          .from('dti-files')
          .download(storagePath)
        if (!fileData) return null
        const buffer = await fileData.arrayBuffer()
        return bytesToBase64(new Uint8Array(buffer))
      }

      const body = await req.json()
      const withLang = body.propertiesWithLanguage || { languages: [], propertyIds: [] }
      const withoutLang = body.propertiesWithoutLanguage || { propertyIds: [] }
      const languages: string[] = Array.isArray(withLang.languages) ? withLang.languages : []
      const withLangIds: string[] = Array.isArray(withLang.propertyIds) ? withLang.propertyIds : []
      const withoutLangIds: string[] = Array.isArray(withoutLang.propertyIds) ? withoutLang.propertyIds : []
      const allEmpty = languages.length === 0 && withLangIds.length === 0 && withoutLangIds.length === 0
      const useUrls = returnUrls || body.returnUrls === true

      // Process a single key with language filter
      async function processKey(key: string, langFilter: string[], result: any[]) {
        if (!byKey[key]) return
        const isFile = typeMap[key] === 1

        if (isFile) {
          // File type: value = entry_id from dti_file_entries
          const entryId = byKey[key][0]?.value
          if (!entryId) return
          const entry = entryMap.get(entryId)
          if (!entry) return

          // Resolve EN and DE based on language filter
          const langsToProcess = langFilter.length > 0 ? langFilter : ['en', 'de']

          for (const lang of langsToProcess) {
            const fileId = lang === 'en' ? entry.en_file_id : entry.de_file_id
            if (!fileId) continue
            const upload = uploadMap.get(fileId)
            if (!upload) continue

            // Empfohlen: Signed URL statt base64 → kein Egress wenn Consumer nicht runterlädt
            if (useUrls) {
              const { data: signedUrlData } = await supabase.storage
                .from('dti-files')
                .createSignedUrl(upload.storage_path, 300)
              if (signedUrlData?.signedUrl) {
                result.push({
                  propertyId: key,
                  value: signedUrlData.signedUrl,
                  mimeType: upload.mime_type,
                  filename: upload.original_name.replace(/\.[^.]+$/, ''),
                  valueLanguage: lang,
                  needsResolve: false,
                  isUrl: true,
                })
                continue
              }
            }

            const isImage = upload.mime_type?.startsWith('image/')
            const base64 = isImage ? await readFileBase64(upload.storage_path) : null
            if (base64) {
              result.push({
                propertyId: key,
                value: base64,
                mimeType: upload.mime_type,
                filename: upload.original_name.replace(/\.[^.]+$/, ''),
                valueLanguage: lang,
                needsResolve: false,
              })
            } else {
              result.push({
                propertyId: key,
                value: fileId,
                mimeType: upload.mime_type,
                filename: upload.original_name.replace(/\.[^.]+$/, ''),
                valueLanguage: lang,
                needsResolve: true,
              })
            }
          }
        } else {
          // Property type: return values filtered by language
          for (const r of byKey[key]) {
            if (langFilter.length > 0 && !langFilter.includes(r.lang)) continue
            result.push({
              propertyId: key,
              value: r.value || '',
              valueLanguage: r.lang || 'en',
              needsResolve: false,
            })
          }
        }
      }

      const result: any[] = []

      if (allEmpty) {
        // Return everything
        for (const key of Object.keys(byKey)) {
          await processKey(key, [], result)
        }
      } else {
        // propertiesWithLanguage
        if (withLangIds.length > 0 || languages.length > 0) {
          const keys = withLangIds.length > 0 ? withLangIds : Object.keys(byKey)
          for (const key of keys) {
            await processKey(key, languages, result)
          }
        }
        // propertiesWithoutLanguage → defaults to "en"
        for (const key of withoutLangIds) {
          await processKey(key, ['en'], result)
        }
      }

      return json(result)
    }

    // POST /Product/:itemId/documents
    const docMatch = path.match(/^\/product\/([^/]+)\/documents$/i)
    if (method === 'POST' && docMatch) {
      const itemId = decodeURIComponent(docMatch[1])

      const { data: asset } = await supabase
        .from('dti_assets')
        .select('asset_id')
        .eq('connector_id', cid)
        .eq('asset_id', itemId)
        .single()
      if (!asset) return err('Asset not found', 404)

      const body = await req.json()
      const languages: string[] = Array.isArray(body.languages) && body.languages.length > 0 ? body.languages : ['en']
      const propertyIds: string[] = Array.isArray(body.propertyIds) ? body.propertyIds : []
      const useUrls = returnUrls || body.returnUrls === true

      // Get uploads directly
      const { data: uploads } = await supabase
        .from('dti_uploads')
        .select('file_id, original_name, mime_type, storage_path')
        .eq('connector_id', cid)

      const uploadMap = new Map((uploads || []).map((u: any) => [u.file_id, u]))

      const result: any[] = []

      for (const fileId of propertyIds) {
        const upload = uploadMap.get(fileId)
        if (!upload) continue

        const filenameNoExt = upload.original_name.replace(/\.[^.]+$/, '')

        // Empfohlen: Signed URL statt base64 → kein Egress wenn Consumer nicht runterlädt
        if (useUrls) {
          const { data: signedUrlData } = await supabase.storage
            .from('dti-files')
            .createSignedUrl(upload.storage_path, 300)
          if (signedUrlData?.signedUrl) {
            for (const lang of languages) {
              result.push({
                propertyId: fileId,
                value: signedUrlData.signedUrl,
                filename: filenameNoExt,
                valueLanguage: lang,
                needsResolve: false,
                isUrl: true,
              })
            }
          }
          continue
        }

        const { data: fileData } = await supabase.storage
          .from('dti-files')
          .download(upload.storage_path)

        if (fileData) {
          const buffer = await fileData.arrayBuffer()
          const value = bytesToBase64(new Uint8Array(buffer))

          for (const lang of languages) {
            result.push({
              propertyId: fileId,
              value,
              filename: filenameNoExt,
              valueLanguage: lang,
              needsResolve: false,
            })
          }
        }
      }

      return json(result)
    }

    // GET /model
    if (method === 'GET' && pathLower === '/model') {
      const { data } = await supabase
        .from('dti_model_datapoints')
        .select('dp_id, name, type')
        .eq('connector_id', cid)
        .order('sort_order')
      return json((data || []).map((d: any) => ({ id: d.dp_id, name: d.name, type: d.type })))
    }

    return err('Not found', 404)
  } catch (e) {
    console.error(e)
    return err('Internal server error', 500)
  }
})
