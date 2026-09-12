$ErrorActionPreference = 'Stop'
$backupPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $backupPython (Join-Path $PSScriptRoot 'backup-storage.py')
if ($LASTEXITCODE -ne 0) { throw 'Backup did not complete. No successful backup should be assumed.' }
