$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path
    ) -Verb RunAs -Wait
    exit 0
}

netsh advfirewall firewall delete rule name="Quant Lab 8000 LAN" | Out-Null
netsh advfirewall firewall add rule name="Quant Lab 8000 LAN" dir=in action=allow protocol=TCP localport=8000 remoteip=localsubnet profile=any

Write-Host ""
Write-Host "已允许局域网设备访问 8000 端口"
Read-Host "按 Enter 关闭"
