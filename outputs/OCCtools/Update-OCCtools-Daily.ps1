[CmdletBinding()]
param([string]$Destination='C:\OCCtools')
$ErrorActionPreference='Stop'
$files=@('server.mjs','log-create.mjs','log-create-request.ps1','checklist-item.mjs','checklist-item-request.ps1','daily-log.mjs','daily-log-request.ps1','migrate-slot-links.mjs','dist\daily-log.js','dist\app.js','dist\templates.js','dist\documents.js','dist\wheel.css','dist\index.html')
$privateFiles=@('log-create-flow-url.txt','checklist-item-flow-url.txt','daily-log-read-flow-url.txt','daily-log-write-flow-url.txt')
foreach ($file in $files) { if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $file) -PathType Leaf)) { throw "Missing update file: $file" } }
foreach ($name in $privateFiles) { if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "private\$name") -PathType Leaf)) { throw "Private flow file is missing: $name" } }
$targetFull=[IO.Path]::GetFullPath($Destination).TrimEnd('\')
if (-not (Test-Path -LiteralPath "$targetFull\data\config.json")) { throw 'Existing OCCtools installation was not found.' }
$service=Get-Service OCCtools
if ($service.Status -ne 'Running') { throw 'OCCtools must be running before this update.' }
$configHash=(Get-FileHash -LiteralPath "$targetFull\data\config.json").Hash
$port=(Get-Content -LiteralPath "$targetFull\data\config.json" -Raw | ConvertFrom-Json).port
if (-not $port) { throw 'Configured port was not found.' }
$backup=Join-Path $targetFull ('daily-update-backup-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backup | Out-Null
& icacls.exe $backup /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not protect backup.' }
$copyFiles=$files+@('data\log-create-flow-url.txt','data\checklist-item-flow-url.txt','data\daily-log-read-flow-url.txt','data\daily-log-write-flow-url.txt')
$allFiles=$copyFiles+@('data\content.json')
Stop-Service OCCtools
try {
    foreach ($file in $allFiles) {
        $target=Join-Path $targetFull $file
        if (Test-Path -LiteralPath $target) {
            $saved=Join-Path $backup $file
            New-Item -ItemType Directory -Path (Split-Path $saved) -Force | Out-Null
            Copy-Item -LiteralPath $target -Destination $saved
        }
    }
} catch { Start-Service OCCtools; throw }
try {
    foreach ($file in $allFiles) {
        if ($file -eq 'data\content.json') { continue }
        $source=if ($file.StartsWith('data\')) { Join-Path $PSScriptRoot ('private\'+[IO.Path]::GetFileName($file)) } else { Join-Path $PSScriptRoot $file }
        $target=Join-Path $targetFull $file
        Copy-Item -LiteralPath $source -Destination $target -Force
        if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw "Verification failed: $file" }
    }
    & node.exe (Join-Path $targetFull 'migrate-slot-links.mjs') (Join-Path $targetFull 'data\content.json')
    if ($LASTEXITCODE -ne 0) { throw 'Could not merge slot links safely.' }
    if ((Get-FileHash -LiteralPath "$targetFull\data\config.json").Hash -ne $configHash) { throw 'Admin configuration changed unexpectedly.' }
    Start-Service OCCtools
    $ready=$false
    for ($i=0;$i -lt 15;$i++) {
        try { $status=Invoke-RestMethod -Uri "http://127.0.0.1:$port/OCCtools/api/log-create" -TimeoutSec 3; $itemStatus=Invoke-RestMethod -Uri "http://127.0.0.1:$port/OCCtools/api/checklist-item" -TimeoutSec 3; $dailyStatus=Invoke-RestMethod -Uri "http://127.0.0.1:$port/OCCtools/api/daily-log" -TimeoutSec 3; if ($status.configured -eq $true -and $itemStatus.configured -eq $true -and $dailyStatus.configured -eq $true -and $dailyStatus.writeConfigured -eq $true) { $ready=$true; break } } catch {}
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Updated service did not report all configured flow endpoints.' }
} catch {
    Stop-Service OCCtools -ErrorAction SilentlyContinue
    foreach ($file in $allFiles) { $saved=Join-Path $backup $file; if (Test-Path -LiteralPath $saved) { Copy-Item -LiteralPath $saved -Destination (Join-Path $targetFull $file) -Force } }
    Start-Service OCCtools
    throw
}
Write-Host "Daily update 20260917-48 installed. Backup: $backup"
Write-Host 'Admin login and existing portal entries are preserved; missing slot links were added. Reload with Ctrl+F5. No SharePoint records were created by this installer.'
