[CmdletBinding()]
param(
    [int]$Port = 4300
)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if (!$connections) {
    Write-Output "No process is using port $Port."
    return
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        Write-Output "Stopping process $($process.ProcessName) (PID $processId) using port $Port."
        Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
        Write-Warning ("Unable to terminate process with PID {0}: {1}" -f $processId, $_)
    }
}


