$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Error ".venv not found; run: python -m venv .venv"
}
Set-Location $root
& $python -m uvicorn quantlab.api.main:app --app-dir "$root\backend" --host 0.0.0.0 --port 8000
