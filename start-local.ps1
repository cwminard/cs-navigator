param(
    [int]$FrontendPort = 3001,
    [int]$BackendPort = 5001,
    [int]$AdkPort = 8080,
    [string]$VertexProject = 'faculty-agent',
    [string]$VertexLocation = 'us-central1'
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'
$adkDir = Join-Path $repoRoot 'adk_agent'
$python = Join-Path $repoRoot '.venv\Scripts\python.exe'
$pidDir = $repoRoot

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    return $false
}

if (-not (Test-Path $python)) {
    throw "Missing Python virtual environment at $python"
}

Remove-Item Env:SSLKEYLOGFILE -ErrorAction SilentlyContinue
$env:GOOGLE_CLOUD_PROJECT = $VertexProject
$env:GOOGLE_CLOUD_LOCATION = $VertexLocation
$env:GOOGLE_GENAI_USE_VERTEXAI = 'TRUE'

$existing8080 = Get-NetTCPConnection -LocalPort $AdkPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing8080) {
    throw "Port $AdkPort is already in use. Run .\stop-local.ps1 or stop the existing ADK process first."
}

Write-Host "Starting ADK on port $AdkPort..."
$adkProc = Start-Process -FilePath $python -ArgumentList @('-m', 'google.adk.cli', 'web', '.', '--port', "$AdkPort") -WorkingDirectory $adkDir -PassThru
Set-Content -Path (Join-Path $pidDir 'adk.pid') -Value $adkProc.Id

if (-not (Wait-ForPort -Port $AdkPort -TimeoutSeconds 30)) {
    throw "ADK did not open port $AdkPort in time."
}

Write-Host "Starting backend on port $BackendPort..."
$backendProc = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', "$BackendPort") -WorkingDirectory $backendDir -PassThru
Set-Content -Path (Join-Path $pidDir 'backend.pid') -Value $backendProc.Id

if (-not (Wait-ForPort -Port $BackendPort -TimeoutSeconds 30)) {
    throw "Backend did not open port $BackendPort in time."
}

Write-Host "Starting frontend on port $FrontendPort..."
$frontendProc = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', "$FrontendPort") -WorkingDirectory $frontendDir -PassThru
Set-Content -Path (Join-Path $pidDir 'frontend.pid') -Value $frontendProc.Id

Write-Host ""
Write-Host "Started local services:"
Write-Host "  ADK:      http://127.0.0.1:$AdkPort"
Write-Host "  Backend:  http://127.0.0.1:$BackendPort/docs"
Write-Host "  Frontend: check the Vite output (usually http://127.0.0.1:$FrontendPort)"
Write-Host ""
Write-Host "To stop everything later, run: .\stop-local.ps1"
