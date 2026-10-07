$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "C:\Users\Saavi\OneDrive\Desktop\Mern\WhyCode\docs\screenshots"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$serverProcess = Start-Process node -ArgumentList "scripts/serveDist.js" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

try {
    Write-Host "Capturing 1440px..."
    Start-Process $chrome -ArgumentList "--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=1440,900", "--screenshot=`"$outDir\screenshot-1440.png`"", "http://localhost:4173/" -Wait
    Start-Sleep -Seconds 1

    Write-Host "Capturing 1024px..."
    Start-Process $chrome -ArgumentList "--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=1024,768", "--screenshot=`"$outDir\screenshot-1024.png`"", "http://localhost:4173/" -Wait
    Start-Sleep -Seconds 1

    Write-Host "Capturing 390px..."
    Start-Process $chrome -ArgumentList "--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=390,844", "--screenshot=`"$outDir\screenshot-390.png`"", "http://localhost:4173/" -Wait
    Start-Sleep -Seconds 1

    Write-Host "All screenshots captured successfully!"
} finally {
    Stop-Process -Id $serverProcess.Id -Force
}
