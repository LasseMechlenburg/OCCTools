# Run from the extracted UI update folder on the OCCtools server.
[CmdletBinding()]
param([string]$Destination = 'C:\OCCtools')
$ErrorActionPreference = 'Stop'
$files = @('app.js','documents.js','wheel.css','index.html')
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "dist\$file") -PathType Leaf)) { throw "Missing update file: $file" }
    if (-not (Test-Path -LiteralPath (Join-Path $Destination "dist\$file") -PathType Leaf)) { throw "Missing installed file: $file" }
}
$backup = Join-Path $Destination ('ui-backup-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup | Out-Null
foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $Destination "dist\$file") -Destination (Join-Path $backup $file) }
try {
    # index.html is copied last so the new asset version is published last.
    foreach ($file in $files) {
        $source = Join-Path $PSScriptRoot "dist\$file"
        $target = Join-Path $Destination "dist\$file"
        Copy-Item -LiteralPath $source -Destination $target -Force
        if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw "Verification failed: $file" }
    }
} catch {
    foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $backup $file) -Destination (Join-Path $Destination "dist\$file") -Force }
    throw
}
Write-Host "UI updated. Backup: $backup"
Write-Host 'Reload the browser. No service restart is required. Data and admin settings were not changed.'
