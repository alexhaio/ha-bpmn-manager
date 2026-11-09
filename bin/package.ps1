<#
.SYNOPSIS
    Packaging and Release script for HA-BPMN-Manager.
.DESCRIPTION
    Packages the clean runtime plugin directory into a production-ready
    WordPress plugin ZIP archive (release/ha-bpmn-manager.zip).
    Excludes all development files, npm configs, and node_modules.
#>

param(
    [switch]$Build = $false,
    [string]$Version = "4.8.7"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$PluginDir = Join-Path $RootDir "plugin"
$ReleaseDir = Join-Path $RootDir "release"
$ZipName = "ha-bpmn-manager-v$Version.zip"
$LatestZipName = "ha-bpmn-manager.zip"
$TargetZip = Join-Path $ReleaseDir $ZipName
$TargetLatestZip = Join-Path $ReleaseDir $LatestZipName

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " HA-BPMN-Manager: Plugin Packaging Tool" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Optionally run asset build first
if ($Build) {
    Write-Host "[INFO] Running build step (-Build specified)..." -ForegroundColor Yellow
    & "$ScriptDir\build.ps1"
}

# 2. Verify plugin runtime folder exists and has required files
if (-not (Test-Path "$PluginDir\ha-bpmn-manager.php")) {
    Write-Host "[ERROR] Main plugin file not found at: $PluginDir\ha-bpmn-manager.php" -ForegroundColor Red
    exit 1
}

# Ensure release directory exists
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
}

# Remove existing zip files if present
if (Test-Path $TargetZip) { Remove-Item $TargetZip -Force }
if (Test-Path $TargetLatestZip) { Remove-Item $TargetLatestZip -Force }

# 3. Create temporary staging directory with slug 'ha-bpmn-manager'
$TempStage = Join-Path $env:TEMP ("ha_bpmn_pkg_" + [System.Guid]::NewGuid().ToString("N"))
$StagePluginFolder = Join-Path $TempStage "ha-bpmn-manager"

try {
    New-Item -ItemType Directory -Path $StagePluginFolder -Force | Out-Null

    Write-Host "[INFO] Staging clean plugin files from '$PluginDir'..." -ForegroundColor Yellow
    Copy-Item -Path "$PluginDir\*" -Destination $StagePluginFolder -Recurse -Force

    # Exclude any unintended dev files if they slipped in
    $excludePatterns = @("*.map", ".git*", "node_modules", "package.json", "package-lock.json", ".DS_Store", "Thumbs.db")
    foreach ($pat in $excludePatterns) {
        Get-ChildItem -Path $StagePluginFolder -Filter $pat -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host "[INFO] Compressing into '$TargetZip'..." -ForegroundColor Yellow
    Compress-Archive -Path $StagePluginFolder -DestinationPath $TargetZip -CompressionLevel Optimal

    # Also make a copy as ha-bpmn-manager.zip (latest)
    Copy-Item -Path $TargetZip -Destination $TargetLatestZip -Force

    $zipItem = Get-Item $TargetZip
    $sizeKb = [math]::Round($zipItem.Length / 1KB, 2)
    $sizeMb = [math]::Round($zipItem.Length / 1MB, 2)

    Write-Host "==========================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Packaging complete!" -ForegroundColor Green
    Write-Host " Release Archive: $TargetZip ($sizeKb KB / $sizeMb MB)" -ForegroundColor Green
    Write-Host " Standard Slug:   ha-bpmn-manager/" -ForegroundColor Green
    Write-Host " Ready to install via WP-Admin: Plugins -> Add New -> Upload Plugin" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
}
finally {
    # Cleanup temp stage
    if (Test-Path $TempStage) {
        Remove-Item -Path $TempStage -Recurse -Force -ErrorAction SilentlyContinue
    }
}
