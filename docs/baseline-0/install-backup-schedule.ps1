$ErrorActionPreference = 'Stop'
$taskName = 'G3 Encrypted Storage Backup'
$runnerPath = (Resolve-Path (Join-Path $PSScriptRoot 'run-managed-backup.ps1')).Path
$arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $runnerPath + '"'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -ne $arguments) { throw 'An unrelated task uses this name; it was not changed' }
$userIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$daily = New-ScheduledTaskTrigger -Daily -At '21:00'
$logon = New-ScheduledTaskTrigger -AtLogOn -User $userIdentity
$principal = New-ScheduledTaskPrincipal -UserId $userIdentity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($daily,$logon) -Principal $principal -Settings $settings -Description 'Encrypted local G3 Storage backup at 21:00 and Windows sign-in. Runs only under the owning Windows profile. Previous snapshots are retained.' -Force | Out-Null
$installed = Get-ScheduledTask -TaskName $taskName
if ($installed.Actions.Arguments -ne $arguments -or $installed.Triggers.Count -ne 2) { throw 'Backup schedule verification failed' }
Write-Output 'Verified: daily 21:00 and sign-in backup schedule installed. Windows sign-in and internet access are required.'
