param()

$ErrorActionPreference = 'SilentlyContinue'

$repoRoot = $PSScriptRoot
$pidFiles = @(
    'adk.pid',
    'backend.pid',
    'frontend.pid'
)

foreach ($pidFile in $pidFiles) {
    $fullPath = Join-Path $repoRoot $pidFile
    if (-not (Test-Path $fullPath)) {
        continue
    }

    $pidText = Get-Content $fullPath -Raw
    $parsedPid = 0
    if ([int]::TryParse($pidText.Trim(), [ref]$parsedPid)) {
        Stop-Process -Id $parsedPid -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped PID $parsedPid from $pidFile"
    }

    Remove-Item $fullPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Local process cleanup complete."
