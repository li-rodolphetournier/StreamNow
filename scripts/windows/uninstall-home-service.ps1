#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$ServiceName = "StreamNowHome"
)

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    try {
        $service = Get-Service -Name $ServiceName
        if ($service.Status -ne 'Stopped') {
            Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Warning "Unable to stop service $ServiceName. Continuing with deletion."
    }

    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    Write-Output "Service '$ServiceName' removed."
} else {
    Write-Output "Service '$ServiceName' is not installed."
}


