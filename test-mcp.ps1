<#
.SYNOPSIS
    Test-Script fuer den AAS-MCP-Server (kein KI-Modell noetig - reiner JSON-RPC-Test).

.DESCRIPTION
    Fuehrt gegen den MCP-Endpoint nacheinander aus:
      1) initialize   - Handshake / Server-Info
      2) tools/list   - erwartet die 8 Tools
      3) tools/call    - echter get_shell-Call gegen das konfigurierte AAS-Repo

    Der MCP-Server ist modell-agnostisch: produktiv kann ihn jeder MCP-faehige
    Client (Claude Desktop, Cursor, n8n, eigener Code) mit beliebigem
    tool-use-faehigen Modell konsumieren.

.PARAMETER BaseUrl
    Origin deiner Plattform, z.B. https://aas-tools.workspaces.neoception.dev
    Daraus wird der Endpoint  $BaseUrl/aas-mcp-api/<ApiKey>  gebaut.

.PARAMETER ApiKey
    API-Key des MCP-Servers (im Tool-Tab "Verbinden" / "Einstellungen" zu finden).

.PARAMETER AasIdentifier
    Rohe AAS-IRI (z.B. https://example.com/aas/1) fuer den get_shell-Call.
    Leer lassen, um Schritt 3 zu ueberspringen.

.PARAMETER Endpoint
    Optionaler Komplett-Override der Endpoint-URL (statt BaseUrl+ApiKey).
    Nuetzlich fuer einen Sofort-Test direkt gegen Supabase, z.B.:
      https://acbkhrfzeyixxdbcbnah.supabase.co/functions/v1/aas-mcp-api/<ApiKey>

.EXAMPLE
    .\test-mcp.ps1 -BaseUrl https://aas-tools.example.com -ApiKey 1234-... -AasIdentifier https://example.com/aas/1
#>

param(
    [string]$BaseUrl,
    [string]$ApiKey,
    [string]$AasIdentifier,
    [string]$Endpoint
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Write-Pass([string]$text) { Write-Host "  [PASS] $text" -ForegroundColor Green }
function Write-Fail([string]$text) { Write-Host "  [FAIL] $text" -ForegroundColor Red }
function Write-Warn([string]$text) { Write-Host "  [WARN] $text" -ForegroundColor Yellow }
function Write-Info([string]$text) { Write-Host "  $text" -ForegroundColor DarkGray }

# --- Endpoint zusammenbauen --------------------------------------------------
if (-not $Endpoint) {
    if (-not $BaseUrl) { $BaseUrl = Read-Host "Plattform-URL (z.B. https://aas-tools.example.com)" }
    if (-not $ApiKey)  { $ApiKey  = Read-Host "API-Key des MCP-Servers" }
    $BaseUrl = $BaseUrl.TrimEnd('/')
    $Endpoint = "$BaseUrl/aas-mcp-api/$ApiKey"
}

if (-not $AasIdentifier) {
    $AasIdentifier = Read-Host "AAS-Identifier fuer get_shell (leer = Schritt 3 ueberspringen)"
}

Write-Host "MCP-Endpoint: $Endpoint" -ForegroundColor White

# --- JSON-RPC Helper ---------------------------------------------------------
$script:rpcId = 0
function Invoke-Rpc {
    param([string]$Method, $RpcParams)
    $script:rpcId++
    $payload = [ordered]@{ jsonrpc = '2.0'; id = $script:rpcId; method = $Method }
    if ($null -ne $RpcParams) { $payload['params'] = $RpcParams }
    $body = $payload | ConvertTo-Json -Depth 12
    try {
        return Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType 'application/json' -Body $body
    }
    catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status) { throw ("HTTP {0} - {1}" -f $status, $_.Exception.Message) }
        throw $_.Exception.Message
    }
}

$results = [ordered]@{}

# --- 1) initialize -----------------------------------------------------------
Write-Step "1/3  initialize"
try {
    $init = Invoke-Rpc -Method 'initialize' -RpcParams @{
        protocolVersion = '2024-11-05'
        capabilities    = @{}
        clientInfo      = @{ name = 'test-mcp.ps1'; version = '1.0.0' }
    }
    $name = $init.result.serverInfo.name
    if ($name -eq 'aas-mcp-server') {
        Write-Pass ("Handshake ok - Server: {0} v{1}, Protokoll: {2}" -f $name, $init.result.serverInfo.version, $init.result.protocolVersion)
        $results['initialize'] = $true
    }
    else {
        Write-Fail ("Unerwartete serverInfo: " + ($init | ConvertTo-Json -Depth 6 -Compress))
        $results['initialize'] = $false
    }
}
catch {
    Write-Fail $_
    Write-Info "Pruefe: ist die Plattform-Domain mit der neuen nginx.conf deployed? Stimmt der API-Key?"
    $results['initialize'] = $false
}

# --- 2) tools/list -----------------------------------------------------------
Write-Step "2/3  tools/list"
try {
    $list = Invoke-Rpc -Method 'tools/list'
    $tools = @($list.result.tools)
    if ($tools.Count -eq 8) {
        Write-Pass "8 Tools gelistet:"
        $results['tools/list'] = $true
    }
    else {
        Write-Warn ("{0} Tools gelistet (erwartet: 8):" -f $tools.Count)
        $results['tools/list'] = $false
    }
    foreach ($t in $tools) { Write-Info ("- {0,-34} {1}" -f $t.name, $t.description) }
}
catch {
    Write-Fail $_
    $results['tools/list'] = $false
}

# --- 3) tools/call get_shell -------------------------------------------------
Write-Step "3/3  tools/call  get_shell"
if (-not $AasIdentifier) {
    Write-Warn "Kein AAS-Identifier angegeben - Schritt uebersprungen."
    $results['tools/call'] = $null
}
else {
    try {
        $call = Invoke-Rpc -Method 'tools/call' -RpcParams @{
            name      = 'get_shell'
            arguments = @{ aasIdentifier = $AasIdentifier }
        }
        $content = @($call.result.content)
        $text = if ($content.Count -gt 0) { [string]$content[0].text } else { '' }
        if ($call.result.isError) {
            Write-Warn "Server meldete isError (Repo nicht erreichbar / ID nicht gefunden / keine Base-URL gesetzt?):"
            Write-Info $text
            $results['tools/call'] = $false
        }
        else {
            Write-Pass "get_shell lieferte Daten:"
            if ($text.Length -gt 1200) { $text = $text.Substring(0, 1200) + "`n  ... (gekuerzt)" }
            Write-Info $text
            $results['tools/call'] = $true
        }
    }
    catch {
        Write-Fail $_
        $results['tools/call'] = $false
    }
}

# --- Summary -----------------------------------------------------------------
Write-Step "Ergebnis"
foreach ($k in $results.Keys) {
    $v = $results[$k]
    if ($v -eq $true)       { Write-Pass $k }
    elseif ($v -eq $false)  { Write-Fail $k }
    else                    { Write-Warn "$k (uebersprungen)" }
}
Write-Host ""
