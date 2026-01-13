# Clean all Kotlin build caches
Write-Host "Cleaning Kotlin caches..."
Get-ChildItem -Path 'D:\Learning\QuckChat\mobile\node_modules' -Recurse -Directory -Filter 'build' | ForEach-Object {
    $kotlinPath = Join-Path $_.FullName 'kotlin'
    if (Test-Path $kotlinPath) {
        Remove-Item -Path $kotlinPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned: $kotlinPath"
    }
}

# Clean app build folder
Write-Host "Cleaning app build folder..."
Remove-Item -Path 'D:\Learning\QuckChat\mobile\android\app\build' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path 'D:\Learning\QuckChat\mobile\android\.gradle' -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Caches cleaned. Ready to build."
