# Builds Port and installs it for the current user:
#   %LOCALAPPDATA%\Programs\Port, plus Start menu and desktop shortcuts.
# Your workspace data lives in %LOCALAPPDATA%\Port and is not touched.
param([switch]$NoDesktopShortcut)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

Write-Host 'Building UI...'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

Write-Host 'Publishing desktop shell...'
$out = Join-Path $repo 'release\Port'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
dotnet publish native/Port.Desktop -c Release -o $out --nologo
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }

$target = Join-Path $env:LOCALAPPDATA 'Programs\Port'
Get-Process Port -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$target*" } | ForEach-Object {
  Write-Host 'Closing running Port...'
  $_.CloseMainWindow() | Out-Null
  if (-not $_.WaitForExit(5000)) { $_.Kill() }
}
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
Copy-Item -Recurse $out $target

$exe = Join-Path $target 'Port.exe'
$shell = New-Object -ComObject WScript.Shell
$links = @(Join-Path ([Environment]::GetFolderPath('Programs')) 'Port.lnk')
if (-not $NoDesktopShortcut) { $links += Join-Path ([Environment]::GetFolderPath('Desktop')) 'Port.lnk' }
foreach ($link in $links) {
  $s = $shell.CreateShortcut($link)
  $s.TargetPath = $exe
  $s.WorkingDirectory = $target
  $s.IconLocation = "$exe,0"
  $s.Description = 'Port workspace browser'
  $s.Save()
}
Write-Host "Installed to $target"
