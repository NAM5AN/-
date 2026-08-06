$ErrorActionPreference = 'Stop'
$Version = '0.12.10'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest = Join-Path $Root 'vendor\ffmpeg'
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

$Files = @(
  @{
    Name = 'ffmpeg-core.js'
    MinBytes = 50000
    Urls = @(
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@$Version/dist/esm/ffmpeg-core.js",
      "https://unpkg.com/@ffmpeg/core@$Version/dist/esm/ffmpeg-core.js"
    )
  },
  @{
    Name = 'ffmpeg-core.wasm'
    MinBytes = 20000000
    Urls = @(
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@$Version/dist/esm/ffmpeg-core.wasm",
      "https://unpkg.com/@ffmpeg/core@$Version/dist/esm/ffmpeg-core.wasm"
    )
  }
)

foreach ($File in $Files) {
  $Out = Join-Path $Dest $File.Name
  $Done = $false
  foreach ($Url in $File.Urls) {
    try {
      Write-Host "Downloading $($File.Name) from $Url"
      Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Out -TimeoutSec 180
      if ((Get-Item $Out).Length -lt $File.MinBytes) {
        throw "Downloaded file is unexpectedly small."
      }
      $Done = $true
      break
    } catch {
      Write-Warning $_
      Remove-Item -Force -ErrorAction SilentlyContinue $Out
    }
  }
  if (-not $Done) {
    throw "Failed to download $($File.Name). Run this script on another network and copy the vendor\ffmpeg folder."
  }
}

Write-Host "Done: $Dest" -ForegroundColor Green
Get-ChildItem $Dest | Select-Object Name, Length
