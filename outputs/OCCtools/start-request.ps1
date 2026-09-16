$ErrorActionPreference = 'Stop'
try {
 [Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
 $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
 $payload = @{checklistCode=$request.checklistCode;reference=$request.reference} | ConvertTo-Json -Compress
 $response = Invoke-WebRequest -UseBasicParsing -Uri $request.url -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 55
 $parsed = [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()).TrimStart([char]0xFEFF) | ConvertFrom-Json
 if ($response.StatusCode -ne 200 -or $parsed.ok -ne $true) { throw 'Unconfirmed' }
 [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
 [Console]::Out.Write('{"ok":true}')
} catch {
 [Console]::Error.Write('Oprettelsen blev ikke bekraeftet.')
 exit 1
}
