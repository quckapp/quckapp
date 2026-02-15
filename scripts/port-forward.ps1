# Port forwarder for Docker Desktop WSL2
# Run as Administrator: powershell -ExecutionPolicy Bypass -File port-forward.ps1

$ports = @(4003, 8082)
$listenAddress = "0.0.0.0"

Write-Host "Starting port forwarders for Docker Desktop WSL2..." -ForegroundColor Green

foreach ($port in $ports) {
    Write-Host "Forwarding port $port..." -ForegroundColor Yellow

    # Start a background job for each port
    Start-Job -Name "Forward-$port" -ScriptBlock {
        param($port, $listenAddress)

        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($listenAddress), $port)
        try {
            $listener.Start()
            Write-Host "Listening on ${listenAddress}:${port}"

            while ($true) {
                $client = $listener.AcceptTcpClient()
                Write-Host "Connection received on port $port"

                # Connect to localhost (Docker)
                $target = [System.Net.Sockets.TcpClient]::new("127.0.0.1", $port)

                # Forward data in both directions
                $clientStream = $client.GetStream()
                $targetStream = $target.GetStream()

                # Simple synchronous forwarding (for demo)
                $buffer = New-Object byte[] 4096
                while ($client.Connected -and $target.Connected) {
                    if ($clientStream.DataAvailable) {
                        $read = $clientStream.Read($buffer, 0, $buffer.Length)
                        if ($read -gt 0) { $targetStream.Write($buffer, 0, $read) }
                    }
                    if ($targetStream.DataAvailable) {
                        $read = $targetStream.Read($buffer, 0, $buffer.Length)
                        if ($read -gt 0) { $clientStream.Write($buffer, 0, $read) }
                    }
                    Start-Sleep -Milliseconds 10
                }

                $client.Close()
                $target.Close()
            }
        } finally {
            $listener.Stop()
        }
    } -ArgumentList $port, $listenAddress
}

Write-Host "`nPort forwarders started. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "Ports: $($ports -join ', ')" -ForegroundColor Cyan

# Keep running
try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Get-Job | Stop-Job
    Get-Job | Remove-Job
}
