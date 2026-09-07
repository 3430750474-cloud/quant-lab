$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
$backend = Join-Path $root "backend"
$healthUrl = "http://127.0.0.1:8000/api/health"

if (-not (Test-Path $python)) {
    Write-Error "未找到 .venv，请先运行 python -m venv .venv"
}

function Get-LanIpv4 {
    $candidates = @()
    $adapter = ""
    $lines = ipconfig
    foreach ($line in $lines) {
        if ($line -match "adapter\s+(.+):") {
            $adapter = $matches[1].Trim()
        }
        elseif ($line -match "IPv4 Address[^:]*:\s*([0-9.]+)") {
            $ip = $matches[1]
            if ($ip -notmatch "^127\.") {
                $candidates += [pscustomobject]@{ Adapter = $adapter; IP = $ip }
            }
        }
    }
    $preferred = $candidates | Where-Object { $_.IP -like "192.168.*" } | Select-Object -First 1
    if ($preferred) {
        return $preferred.IP
    }
    if ($candidates.Count -gt 0) {
        return $candidates[0].IP
    }
    throw "未找到局域网 IPv4 地址"
}

$running = $false
try {
    $response = Invoke-WebRequest -UseBasicParsing $healthUrl -TimeoutSec 2
    $running = $response.StatusCode -eq 200
} catch {
    $running = $false
}

if (-not $running) {
    Start-Process -FilePath $python -ArgumentList @(
        "-m", "uvicorn", "quantlab.api.main:app",
        "--app-dir", $backend,
        "--host", "0.0.0.0",
        "--port", "8000"
    ) -WorkingDirectory $root -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

$lanIp = Get-LanIpv4
$url = "http://${lanIp}:8000/"
Write-Host "Quant Lab: $url"
$firewallOutput = netsh advfirewall firewall show rule name="Quant Lab 8000 LAN" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "提示：如果手机打不开，请双击根目录 手机访问设置.bat，并在弹窗中点“是”。"
    Start-Sleep -Seconds 4
}
Start-Process $url
