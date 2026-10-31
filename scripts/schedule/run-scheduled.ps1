# Runs the daily report headless. Invoked by the Windows Task Scheduler task
# "Professor-DailyReport" (registered with: npm run fp -- schedule enable).
# Exits non-zero on failure so the task's RestartOnFailure retries once after 10 minutes.

$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repo

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$runId = "scheduled-$stamp"
$logDir = Join-Path $repo 'data\runs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "$runId.log"

# Least privilege: only the tools the daily-report skill needs (research.md R8/R9).
$allowedTools = 'Read,WebFetch,Bash(npm run -s fp *),Bash(npm run fp *),Write(data/runs/**)'

try {
    & claude -p '/daily-report --scheduled' --allowedTools $allowedTools *>&1 | Tee-Object -FilePath $log
    $code = $LASTEXITCODE
} catch {
    $_ | Out-File -FilePath $log -Append
    $code = 1
}

if ($code -ne 0) {
    $tail = (Get-Content $log -Tail 5 -ErrorAction SilentlyContinue) -join ' '
    if (-not $tail) { $tail = 'no output' }
    if ($tail.Length -gt 400) { $tail = $tail.Substring($tail.Length - 400) }
    npm run -s fp -- record-failure --run $runId --error "claude exited with code ${code}: $tail" | Out-Null
    exit $code
}
exit 0
