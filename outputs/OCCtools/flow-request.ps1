$ErrorActionPreference = 'Stop'
try {
 $target = [Console]::In.ReadToEnd().Trim()
 $response = Invoke-WebRequest -UseBasicParsing -Uri $target -Method Post -ContentType 'application/json' -Body '{}' -TimeoutSec 55
 # JSON is UTF-8 even when the response omits a charset header.
 $json = [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()).TrimStart([char]0xFEFF)
 # Parse and serialize once so PowerShell cannot pass encoding or wrapper text on to Node.
 $parsed = $json | ConvertFrom-Json
 $json = $parsed | ConvertTo-Json -Depth 30 -Compress
 [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
 [Console]::Out.Write($json)
} catch {
 [Console]::Error.Write('Power Automate-kaldet mislykkedes. Kontrollér flowets kørselshistorik og serverens netværksadgang.')
 exit 1
}
