Add-Type -AssemblyName System.Drawing

function Create-ChatIcon {
    param([int]$size, [string]$outputPath)

    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = 'HighQuality'
    $graphics.InterpolationMode = 'HighQualityBicubic'
    $graphics.PixelOffsetMode = 'HighQuality'

    # Blue background color (#0066FF)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 102, 255))

    # Draw circle background
    $padding = [int]($size * 0.05)
    $circleSize = $size - (2 * $padding)

    $graphics.FillEllipse($brush, $padding, $padding, $circleSize, $circleSize)

    # Draw 'Q' letter in white
    $fontFamily = 'Segoe UI'
    $fontSize = [int]($size * 0.55)
    $font = New-Object System.Drawing.Font($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = 'Center'
    $stringFormat.LineAlignment = 'Center'

    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $graphics.DrawString('Q', $font, $whiteBrush, $rect, $stringFormat)

    $graphics.Dispose()
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()

    Write-Host "Created: $outputPath"
}

# Create assets folder icons
Create-ChatIcon -size 1024 -outputPath 'D:\Learning\QuckChat\mobile\assets\icon.png'
Create-ChatIcon -size 1024 -outputPath 'D:\Learning\QuckChat\mobile\assets\adaptive-icon.png'

# Create Android mipmap icons
Create-ChatIcon -size 48 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-mdpi\ic_launcher.png'
Create-ChatIcon -size 48 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png'
Create-ChatIcon -size 72 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-hdpi\ic_launcher.png'
Create-ChatIcon -size 72 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png'
Create-ChatIcon -size 96 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xhdpi\ic_launcher.png'
Create-ChatIcon -size 96 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png'
Create-ChatIcon -size 144 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png'
Create-ChatIcon -size 144 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png'
Create-ChatIcon -size 192 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png'
Create-ChatIcon -size 192 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png'

# Create foreground icons for adaptive icons
Create-ChatIcon -size 108 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-mdpi\ic_launcher_foreground.png'
Create-ChatIcon -size 162 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-hdpi\ic_launcher_foreground.png'
Create-ChatIcon -size 216 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xhdpi\ic_launcher_foreground.png'
Create-ChatIcon -size 324 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_foreground.png'
Create-ChatIcon -size 432 -outputPath 'D:\Learning\QuckChat\mobile\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png'

Write-Host 'All icons created successfully!'
