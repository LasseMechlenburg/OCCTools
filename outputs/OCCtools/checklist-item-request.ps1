$ErrorActionPreference = 'Stop'
try {
    [Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
    $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $payload = @{mode=$request.mode;title=$request.title}
    if ($request.mode -eq 'open') { $payload.runId=$request.runId }
    elseif ($request.mode -eq 'future') { $payload.checklistCode=$request.checklistCode; $payload.date=$request.date }
    else { throw 'Invalid mode' }
    $json = $payload | ConvertTo-Json -Compress
    $response = Invoke-WebRequest -UseBasicParsing -Uri $request.url -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 55
    $parsed = [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()).TrimStart([char]0xFEFF) | ConvertFrom-Json
    if ($response.StatusCode -ne 200 -or $parsed.ok -ne $true) { throw 'Unconfirmed' }
    [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
    [Console]::Out.Write('{"ok":true}')
} catch {
    [Console]::Error.Write('Checklist-punktet blev ikke bekraeftet. Kontroller flowhistorikken.')
    exit 1
}
