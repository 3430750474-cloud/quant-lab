$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
$backend = Join-Path $root "backend"
$url = "http://127.0.0.1:8000/"

if (-not (Test-Path $python)) {
    Write-Error "未找到 .venv，请先运行 python -m venv .venv"
}

$running = $false
try {
    $response = Invoke-WebRequest -UseBasicParsing "$url/api/health" -TimeoutSec 2
    $running = $response.StatusCode -eq 200
} catch {
    $running = $false
}

if (-not $running) {
    Start-Process -FilePath $python -ArgumentList @(
        "-m", "uvicorn", "quantlab.api.main:app",
        "--app-dir", $backend,
        "--host", "127.0.0.1",
        "--port", "8000"
    ) -WorkingDirectory $root -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Start-Process $url
