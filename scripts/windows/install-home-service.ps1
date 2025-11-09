#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$ServiceName = "StreamNowHome",
    [string]$DisplayName = "StreamNow Home Server",
    [string]$Description = "Local media server for StreamNow."
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$nodeCommand = (Get-Command node -ErrorAction Stop).Source
$entryPoint = Join-Path $root "apps\home-server\dist\index.js"

if (-not (Test-Path $entryPoint)) {
    Write-Error "Build not found. Execute 'npm run home:build' before installing the service."
}

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    try {
        Stop-Service $ServiceName -ErrorAction SilentlyContinue | Out-Null
    } catch {
        Write-Warning "Unable to stop existing service. Continuing with deletion."
    }
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

$binaryPath = "`"$nodeCommand`" `"$entryPoint`""

New-Service `
    -Name $ServiceName `
    -BinaryPathName $binaryPath `
    -DisplayName $DisplayName `
    -Description $Description `
    -StartupType Automatic | Out-Null

Start-Service $ServiceName

Write-Output "Service '$ServiceName' installed and started successfully."


