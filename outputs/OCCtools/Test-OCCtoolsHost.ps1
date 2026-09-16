# Read-only checks. Run on the intended Windows/IIS server, not the local preview PC.
[CmdletBinding()]
param([string]$SiteName='', [string]$PythonPath='python.exe')
$ErrorActionPreference='Continue'
Write-Output ('Computer: '+$env:COMPUTERNAME)
foreach($name in @('node.exe','git.exe','nssm.exe',$PythonPath)) {
 $tool=Get-Command $name -ErrorAction SilentlyContinue
 if($tool){Write-Output ($name+': '+$tool.Source)}else{Write-Output ($name+': NOT FOUND')}
}
if(Get-Command node.exe -ErrorAction SilentlyContinue){& node.exe --version}
if(Get-Command $PythonPath -ErrorAction SilentlyContinue){& $PythonPath -c 'import sys; print(sys.version); import pypdf, pypdfium2, PIL; print("PDF modules OK")'}
if(Get-Module -ListAvailable WebAdministration){
 Import-Module WebAdministration
 Get-Website | Select-Object Name,State,@{n='Bindings';e={$_.Bindings.Collection.bindingInformation -join '; '}}
 Get-WebGlobalModule | Where-Object {$_.Name -in @('RewriteModule','ApplicationRequestRouting')} | Select-Object Name
 Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled | Select-Object Value
 if($SiteName){
  Get-WebApplication -Site $SiteName | Select-Object Path,PhysicalPath
  foreach($kind in @('anonymousAuthentication','windowsAuthentication')){
   $value=Get-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Location $SiteName -Filter ('system.webServer/security/authentication/'+$kind) -Name enabled
   Write-Output ($kind+': '+$value.Value)
  }
 }
}else{Write-Output 'IIS WebAdministration module NOT FOUND'}
Get-Service OCCtools -ErrorAction SilentlyContinue | Select-Object Name,Status
Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess
Write-Output 'No configuration has been changed. Do not send flow keys, config.json or document contents.'
