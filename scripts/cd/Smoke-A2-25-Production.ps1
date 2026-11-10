# Read-only production smoke probe for BrewLite. Do not use on untrusted URLs.
param(
    [Parameter(Mandatory = $true)][string]$WebUrl,
    [Parameter(Mandatory = $true)][string]$ApiUrl,
    [string]$OutputDirectory = '',
    [switch]$AllowHttpLocal
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $repo 'work/A2-25/evidence'
}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

function Test-Origin([string]$Value, [string]$Name) {
    $uri = [Uri]$Value
    if (-not $uri.IsAbsoluteUri) { throw "$Name must be an absolute URL" }
    if ($uri.Scheme -eq 'https') { return }
    if ($AllowHttpLocal -and $uri.Scheme -eq 'http' -and $uri.Host -in @('localhost','127.0.0.1')) { return }
    throw "$Name must use HTTPS (except explicitly allowed localhost)"
}
Test-Origin $WebUrl 'WebUrl'
Test-Origin $ApiUrl 'ApiUrl'

$checks = @(
    @{ Name = 'API health'; Uri = "$($ApiUrl.TrimEnd('/'))/health" },
    @{ Name = 'API products'; Uri = "$($ApiUrl.TrimEnd('/'))/products" },
    @{ Name = 'Web root'; Uri = "$($WebUrl.TrimEnd('/'))/" }
)
$results = @()
foreach ($check in $checks) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $status = 0
    $outcome = 'FAIL'
    $note = ''
    try {
        $res = Invoke-WebRequest -UseBasicParsing -Uri $check.Uri -Method Get -TimeoutSec 20
        $status = [int]$res.StatusCode
        if ($status -eq 200) { $outcome = 'PASS' }
        else { $note = "HTTP $status" }
    } catch {
        $note = $_.Exception.Message
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { }
        }
    }
    $sw.Stop()
    Write-Host "[$outcome] $($check.Name): HTTP $status ($([math]::Round($sw.Elapsed.TotalMilliseconds, 2)) ms)"
    $results += [pscustomobject]@{
        Check = $check.Name
        StatusCode = $status
        Result = $outcome
        DurationMs = [math]::Round($sw.Elapsed.TotalMilliseconds, 2)
        Error = $note
        TimestampUtc = [DateTime]::UtcNow.ToString('o')
    }
}
$path = Join-Path $OutputDirectory ("a2-25-smoke-{0}.csv" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$results | Export-Csv -Path $path -NoTypeInformation -Encoding UTF8
Write-Host "Saved: $path"
if ($results.Where({ $_.Result -ne 'PASS' }).Count -gt 0) { exit 1 }
