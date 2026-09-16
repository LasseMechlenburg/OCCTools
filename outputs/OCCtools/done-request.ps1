$ErrorActionPreference = 'Stop'
try {
 [Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
 $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
 $payload = @{itemId=$request.itemId;doneBy=$request.doneBy} | ConvertTo-Json -Compress
 $response = Invoke-WebRequest -UseBasicParsing -Uri $request.url -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 55
 $json = [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()).TrimStart([char]0xFEFF)
 $parsed = $json | ConvertFrom-Json
 if ($response.StatusCode -ne 200 -or $parsed.ok -ne $true -or $parsed.done -ne $true) { throw 'Unconfirmed' }
 [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
 [Console]::Out.Write('{"ok":true,"done":true}')
} catch {
 [Console]::Error.Write('Gemningen blev ikke bekraeftet. Kontrollér SharePoint før et nyt forsøg.')
 exit 1
}
