// Global Connector — External API Edge Function
// Deploy: supabase functions deploy global-api --no-verify-jwt
//
// Base URL: https://{project-ref}.supabase.co/functions/v1/global-api/{apiKey}/...
// The itemId parameter is ignored — all endpoints always return the GLOBAL (first asset) column.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5/xlsx.mjs'

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

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    pdf: 'application/pdf', json: 'application/json', xml: 'application/xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    svg: 'image/svg+xml', webp: 'image/webp',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv', txt: 'text/plain', html: 'text/html',
    zip: 'application/zip', gz: 'application/gzip',
  }
  return map[ext] || 'application/octet-stream'
}

function parseExcel(rows: any[][]) {
  const header = rows[0] || []

  // Find hierarchy levels
  const hierarchyStartRow = 2
  let datapointStartRow = hierarchyStartRow

  for (let i = hierarchyStartRow; i < rows.length; i++) {
    const element = String(rows[i]?.[0] || '').trim()
    if (!element) {
      datapointStartRow = i + 1
      break
    }
    datapointStartRow = i + 1
  }

  // Always use column index 2 (first asset column = GLOBAL)
  const globalColIdx = 2

  // Parse datapoints
  const datapoints: { rowIdx: number; key: string; type: string; lang: string; cleanKey: string }[] = []

  for (let i = datapointStartRow; i < rows.length; i++) {
    const row = rows[i]
    const key = String(row?.[0] || '').trim()
    const type = String(row?.[1] || '').trim()
    if (!key || !type) continue

    let lang = 'en'
    let cleanKey = key
    if (key.startsWith('EN:')) { lang = 'en'; cleanKey = key.substring(3) }
    else if (key.startsWith('DE:')) { lang = 'de'; cleanKey = key.substring(3) }

    datapoints.push({ rowIdx: i, key, type, lang, cleanKey })
  }

  return { globalColIdx, datapoints, rows }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/global-api\//, '').split('/').filter(Boolean)

  if (!parts[0]) return err('Not found', 404)
  const apiKey = parts[0]
  if (!UUID_RE.test(apiKey)) return err('Invalid API key', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: conn } = await supabase
    .from('global_connectors')
    .select('connector_id, user_id, excel_path')
    .eq('api_key', apiKey)
    .single()

  if (!conn) return err('Invalid API key', 401)
  if (!conn.excel_path) return err('No Excel file configured', 404)

  const path = '/' + parts.slice(1).join('/')
  const method = req.method

  try {
    const { data: signedData } = await supabase.storage
      .from('global-connectors')
      .createSignedUrl(conn.excel_path, 60)

    if (!signedData?.signedUrl) return err('Excel file not found', 404)

    const fileRes = await fetch(signedData.signedUrl)
    if (!fileRes.ok) return err('Excel file not found', 404)

    const buf = await fileRes.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

    const excel = parseExcel(rows)
    const colIdx = excel.globalColIdx

    // POST /Product/:itemId/values — itemId is ignored
    const valMatch = path.match(/^\/Product\/([^/]+)\/values$/)
    if (method === 'POST' && valMatch) {
      let body: any = {}
      try { body = await req.json() } catch { /* empty body = return all */ }

      const withLang = body.propertiesWithLanguage || { languages: [], propertyIds: [] }
      const withoutLang = body.propertiesWithoutLanguage || { propertyIds: [] }
      const languages: string[] = Array.isArray(withLang.languages) ? withLang.languages : []
      const withLangIds: string[] = Array.isArray(withLang.propertyIds) ? withLang.propertyIds : []
      const withoutLangIds: string[] = Array.isArray(withoutLang.propertyIds) ? withoutLang.propertyIds : []
      const allEmpty = languages.length === 0 && withLangIds.length === 0 && withoutLangIds.length === 0

      const result: any[] = []
      const docFolder = `${conn.user_id}/${conn.connector_id}/documents`

      for (const dp of excel.datapoints) {
        const value = String(rows[dp.rowIdx]?.[colIdx] || '').trim()
        if (!value) continue

        if (!allEmpty) {
          const inWithLang = withLangIds.length === 0 || withLangIds.includes(dp.cleanKey)
          const inWithoutLang = withoutLangIds.includes(dp.cleanKey)
          const langMatch = languages.length === 0 || languages.includes(dp.lang)

          if (inWithoutLang) {
            if (dp.lang !== 'en') continue
          } else if (!inWithLang || !langMatch) {
            continue
          }
        }

        const filenameNoExt = value.replace(/\.[^.]+$/, '')

        if (dp.type === 'Document') {
          const storagePath = `${docFolder}/${value}`
          const mimeFromExt = guessMimeType(value)
          const { data: signed } = await supabase.storage
            .from('global-connectors')
            .createSignedUrl(storagePath, 60)

          if (signed?.signedUrl) {
            const fileRes = await fetch(signed.signedUrl)
            if (fileRes.ok) {
              const fileBuffer = await fileRes.arrayBuffer()
              const mimeType = fileRes.headers.get('content-type') || mimeFromExt
              const isImage = mimeType.startsWith('image/')

              if (isImage) {
                const bytes = new Uint8Array(fileBuffer)
                let binary = ''
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

                result.push({
                  propertyId: dp.cleanKey,
                  value: btoa(binary),
                  mimeType,
                  filename: filenameNoExt,
                  valueLanguage: dp.lang,
                  needsResolve: false,
                })
                continue
              }
            }
          }

          result.push({
            propertyId: dp.cleanKey,
            value: filenameNoExt,
            mimeType: mimeFromExt,
            filename: filenameNoExt,
            valueLanguage: dp.lang,
            needsResolve: true,
          })
        } else {
          result.push({
            propertyId: dp.cleanKey,
            value,
            valueLanguage: dp.lang,
            needsResolve: false,
          })
        }
      }

      return json(result)
    }

    // POST /Product/:itemId/documents — itemId is ignored
    const docMatch = path.match(/^\/Product\/([^/]+)\/documents$/)
    if (method === 'POST' && docMatch) {
      let body: any = {}
      try { body = await req.json() } catch { /* empty body = return all */ }
      const languages: string[] = Array.isArray(body.languages) && body.languages.length > 0 ? body.languages : ['en', 'de']
      const propertyIds: string[] = Array.isArray(body.propertyIds) ? body.propertyIds : []

      const result: any[] = []
      const docFolder = `${conn.user_id}/${conn.connector_id}/documents`

      const docLookup = new Map<string, { filename: string; lang: string }[]>()
      for (const dp of excel.datapoints) {
        if (dp.type !== 'Document') continue
        const filename = String(rows[dp.rowIdx]?.[colIdx] || '').trim()
        if (!filename) continue
        const filenameNoExt = filename.replace(/\.[^.]+$/, '')
        if (!docLookup.has(filenameNoExt)) docLookup.set(filenameNoExt, [])
        docLookup.get(filenameNoExt)!.push({ filename, lang: dp.lang })
      }

      const toResolve = propertyIds.length > 0 ? propertyIds : [...docLookup.keys()]

      for (const fileId of toResolve) {
        const entries = docLookup.get(fileId)
        if (!entries) continue

        for (const entry of entries) {
          if (!languages.includes(entry.lang)) continue

          const storagePath = `${docFolder}/${entry.filename}`
          const { data: signed } = await supabase.storage
            .from('global-connectors')
            .createSignedUrl(storagePath, 60)

          if (signed?.signedUrl) {
            const fileRes = await fetch(signed.signedUrl)
            if (fileRes.ok) {
              const fileBuffer = await fileRes.arrayBuffer()
              const bytes = new Uint8Array(fileBuffer)
              let binary = ''
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])

              result.push({
                propertyId: fileId,
                value: btoa(binary),
                filename: fileId,
                valueLanguage: entry.lang,
                needsResolve: false,
              })
            }
          }
        }
      }

      return json(result)
    }

    // GET /model
    if (method === 'GET' && path === '/model') {
      const seen = new Set<string>()
      const result: any[] = []

      for (const dp of excel.datapoints) {
        if (seen.has(dp.cleanKey)) continue
        seen.add(dp.cleanKey)
        result.push({
          id: dp.cleanKey,
          name: dp.cleanKey,
          type: dp.type === 'Document' ? 1 : 0,
        })
      }

      return json(result)
    }

    return err('Not found', 404)
  } catch (e) {
    console.error(e)
    return err('Internal server error', 500)
  }
})
