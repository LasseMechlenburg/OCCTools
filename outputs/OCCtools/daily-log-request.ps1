$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try {
 $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
 $json=$request.body | ConvertTo-Json -Depth 12 -Compress
 $response=Invoke-WebRequest -UseBasicParsing -Uri $request.url -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 55
 $body=[Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()).TrimStart([char]0xFEFF) | ConvertFrom-Json
 [Console]::Out.Write((@{status=[int]$response.StatusCode;body=$body} | ConvertTo-Json -Depth 30 -Compress))
} catch {
 # Only known flow rejection codes are exposed. Never emit a signed URL or upstream error text.
 $status=0
 try { $status=[int]$_.Exception.Response.StatusCode } catch {}
 if ($status -eq 409 -or $status -eq 412) {
  [Console]::Out.Write('{"status":409,"body":{"ok":false}}')
 } else {
  [Console]::Error.Write('Daily log request was not confirmed.')
  exit 1
 }
}
