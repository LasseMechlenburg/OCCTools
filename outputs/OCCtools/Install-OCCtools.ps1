# Kør i Windows PowerShell 5.1 som administrator på IIS-serveren.
[CmdletBinding()]
param(
 [string]$SiteName = 'Default Web Site',
 [string]$Destination = 'C:\OCCtools',
 [string]$Origin = 'https://occ.ne.int',
 [int]$Port = 8787,
 [string]$NssmPath = 'nssm.exe',
 [string]$PythonPath = 'python.exe',
 [switch]$ConfirmRestrictedAccess,
 [string]$AdminUsername = 'Lasse'
)
$ErrorActionPreference = 'Stop'
$serviceName = 'OCCtools'
if (-not $ConfirmRestrictedAccess) { throw 'Bekraeft foerst at IIS-sitet kun er tilgaengeligt for autoriserede OCC-brugere. Koer derefter med -ConfirmRestrictedAccess. Admin-login alene beskytter ikke portalens data.' }
$originUri = [Uri]$Origin
if ($originUri.Scheme -ne 'https' -or $originUri.GetLeftPart([UriPartial]::Authority) -ne $Origin) { throw 'Angiv en HTTPS-origin uden sti eller afsluttende skraastreg.' }
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Start Windows PowerShell som administrator.' }
Import-Module WebAdministration
if (-not (Test-Path -LiteralPath "IIS:\Sites\$SiteName")) { throw "IIS-sitet '$SiteName' findes ikke. Angiv -SiteName med det eksisterende sites navn." }
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$nssmExe = (Get-Command $NssmPath -ErrorAction Stop).Source
$pythonExe = (Get-Command $PythonPath -ErrorAction Stop).Source
& $pythonExe -c 'import pypdf, pypdfium2, PIL'
if ($LASTEXITCODE -ne 0) { throw 'Python mangler pypdf, pypdfium2 eller Pillow. Installer dem i serverens Python-miljoe foer installation.' }
$major = [int]((& $nodeExe --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw 'Installer Node.js 22 eller nyere fra nodejs.org før installation.' }
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) { throw 'OCCtools-tjenesten findes allerede. Se opdateringsafsnittet i README.md.' }
if (Get-WebApplication -Site $SiteName -Name 'OCCtools') { throw '/OCCtools findes allerede. Der er ikke ændret noget.' }
$modules = @(Get-WebGlobalModule | Select-Object -ExpandProperty Name)
if ('RewriteModule' -notin $modules -or 'ApplicationRequestRouting' -notin $modules) { throw 'IIS mangler URL Rewrite og/eller Application Request Routing (ARR). Installer Microsofts moduler og aktivér ARR > Server Proxy Settings > Enable proxy. Se README.md.' }
$proxy = Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled
if (-not [bool]$proxy.Value) { throw 'ARR proxy er ikke aktiveret. Aktivér Enable proxy under ARR Server Proxy Settings. Scriptet ændrer ikke serverens fælles proxyindstilling.' }
$targetFull = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
if ($targetFull -eq [IO.Path]::GetPathRoot($targetFull).TrimEnd('\') -or $targetFull -eq $env:USERPROFILE.TrimEnd('\')) { throw 'Vælg en særskilt mappe, fx C:\OCCtools.' }
if (Test-Path -LiteralPath $targetFull) { throw "Destinationsmappen findes allerede: $targetFull. Vælg en ny tom destination." }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "Port $Port er i brug. Angiv en anden med -Port." }
$secret = Read-Host 'Vælg admin-adgangskode (mindst 14 tegn)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
 $passwordText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
 if ($passwordText.Length -lt 14) { throw 'Adgangskoden skal have mindst 14 tegn.' }
 New-Item -ItemType Directory -Path $targetFull | Out-Null
 foreach ($name in @('dist','server.mjs','templates.mjs','logs.mjs','log-create.mjs','log-create-request.ps1','checklist-item.mjs','checklist-item-request.ps1','runitems.mjs','checklist-start.mjs','checklist-done.mjs','documents.mjs','pdf-index.py','pdf-preview.py','flow-request.ps1','start-request.ps1','done-request.ps1','init-admin.mjs','seed.json','package.json','README.md','DEPLOY.md')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $targetFull -Recurse }
 $setupJson = @{ username=$AdminUsername; password=$passwordText; origin=$Origin; port=$Port } | ConvertTo-Json -Compress
 # JSON escapes preserve Danish characters through Windows PowerShell 5.1's native pipe.
 $setupAscii = [regex]::Replace($setupJson, '[^\x00-\x7F]', { param($m) '\u{0:x4}' -f [int][char]$m.Value })
 $setupAscii | & $nodeExe (Join-Path $targetFull 'init-admin.mjs')
 if ($LASTEXITCODE -ne 0) { throw 'Adminopsætningen mislykkedes. Ingen tjeneste eller IIS-applikation er oprettet.' }
} finally {
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
 $passwordText = $null
 $setupJson = $null
 $setupAscii = $null
 $secret.Dispose()
}
$dataPath = Join-Path $targetFull 'data'
& icacls.exe $dataPath /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Kunne ikke beskytte datamappen. Stopper før tjenesten startes.' }
# LocalService skal kunne læse programmet; data får skriveadgang separat ovenfor.
& icacls.exe $targetFull /grant '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Kunne ikke tildele læseadgang.' }
$proxyDir = Join-Path $targetFull 'iis-proxy'
New-Item -ItemType Directory -Path $proxyDir | Out-Null
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration><system.webServer><security><requestFiltering><requestLimits maxAllowedContentLength="40000000" /></requestFiltering></security><rewrite><rules><clear /><rule name="OCCtools local service" stopProcessing="true"><match url="(.*)" /><action type="Rewrite" url="http://127.0.0.1:$Port/OCCtools/{R:1}" appendQueryString="true" /></rule></rules></rewrite><httpErrors existingResponse="PassThrough" /></system.webServer></configuration>
"@
[IO.File]::WriteAllText((Join-Path $proxyDir 'web.config'), $webConfig, [Text.UTF8Encoding]::new($false))
function Invoke-Nssm([string[]]$Arguments) { & $nssmExe @Arguments; if ($LASTEXITCODE -ne 0) { throw "NSSM-handling mislykkedes: $($Arguments[0]). Se status for OCCtools før et nyt forsøg." } }
Invoke-Nssm -Arguments @('install',$serviceName,$nodeExe)
Invoke-Nssm -Arguments @('set',$serviceName,'AppDirectory',$targetFull)
Invoke-Nssm -Arguments @('set',$serviceName,'AppParameters',('"' + (Join-Path $targetFull 'server.mjs') + '"'))
Invoke-Nssm -Arguments @('set',$serviceName,'AppEnvironmentExtra',('OCC_PYTHON='+$pythonExe))
Invoke-Nssm -Arguments @('set',$serviceName,'ObjectName','NT AUTHORITY\LocalService')
Invoke-Nssm -Arguments @('set',$serviceName,'Start','SERVICE_AUTO_START')
Invoke-Nssm -Arguments @('set',$serviceName,'AppStdout',(Join-Path $dataPath 'service-out.log'))
Invoke-Nssm -Arguments @('set',$serviceName,'AppStderr',(Join-Path $dataPath 'service-error.log'))
Invoke-Nssm -Arguments @('set',$serviceName,'AppRotateFiles','1')
Invoke-Nssm -Arguments @('set',$serviceName,'AppRotateOnline','1')
Invoke-Nssm -Arguments @('set',$serviceName,'AppRotateBytes','1048576')
Invoke-Nssm -Arguments @('start',$serviceName)
$ready = $false
for ($attempt=0; $attempt -lt 15; $attempt++) { try { $check = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/OCCtools/api/content"; if ($check.StatusCode -eq 200) { $ready=$true; break } } catch { Start-Sleep -Seconds 1 } }
if (-not $ready) { throw "Tjenesten svarede ikke. Se logfiler i $dataPath. IIS-applikationen er endnu ikke oprettet." }
New-WebApplication -Site $SiteName -Name 'OCCtools' -PhysicalPath $proxyDir | Out-Null
Write-Host "Installeret. Aabn $Origin/OCCtools/ og log ind som $AdminUsername med din valgte adgangskode."
Write-Host 'Hvis IIS returnerer en fejl, se README.md. Eksisterende /rootz er ikke ændret af scriptet.'
