param([string]$Restore, [string]$Destination)
$ErrorActionPreference = 'Stop'
if (($Restore -and !$Destination) -or ($Destination -and !$Restore)) { throw 'Restore requires both -Restore and a new -Destination directory' }
Add-Type -AssemblyName System.Security
$configurationPath = Join-Path $PSScriptRoot '../staging/backup-config.local.dpapi'
$backupPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
if (!(Test-Path -LiteralPath $configurationPath)) { throw 'Encrypted backup configuration is missing' }
$protectedBytes = [IO.File]::ReadAllBytes($configurationPath)
$configurationBytes = [Security.Cryptography.ProtectedData]::Unprotect($protectedBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$configuration = [Text.Encoding]::UTF8.GetString($configurationBytes)
try {
    $backupArguments = @((Join-Path $PSScriptRoot 'backup-storage.py'), '--managed')
    if ($Restore) { $backupArguments += @('--restore', $Restore, '--destination', $Destination) }
    $configuration | & $backupPython @backupArguments
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed. Previous snapshots were retained.' }
} finally {
    [Array]::Clear($configurationBytes,0,$configurationBytes.Length)
    $configuration = $null
}
