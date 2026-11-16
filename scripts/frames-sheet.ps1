$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Drawing
$dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'frames'
$files = Get-ChildItem $dir -Filter 'f*.png' | Sort-Object Name
$cols = 7
$cw = 210
$ch = 454
$rows = [math]::Ceiling($files.Count / $cols)
$bmp = New-Object System.Drawing.Bitmap(($cols * $cw), ($rows * $ch))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(20, 20, 24))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = New-Object System.Drawing.Font('Arial', 14, [System.Drawing.FontStyle]::Bold)
for ($i = 0; $i -lt $files.Count; $i++) {
  $cx = ($i % $cols) * $cw
  $cy = [math]::Floor($i / $cols) * $ch
  try {
    $img = [System.Drawing.Image]::FromFile($files[$i].FullName)
    $g.DrawImage($img, $cx, $cy, $cw, $ch)
    $img.Dispose()
  } catch { }
  $g.DrawString(($i + 1).ToString(), $font, [System.Drawing.Brushes]::Yellow, $cx + 4, $cy + 2)
}
$g.Dispose()
$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'frames-sheet.jpg'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
Write-Host "saved $out"
