# setup_task.ps1
# Run once as Administrator to register the Windows Task Scheduler job.
# It will run fetch_analytics every 6 hours, starting at midnight today.

$TaskName   = "ContentAnalyticsFetch"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatchFile  = Join-Path $ScriptDir "run_analytics.bat"

# Remove existing task with same name (idempotent re-run)
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action  = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchFile`""
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 6) `
               -Once -At (Get-Date -Hour 0 -Minute 0 -Second 0)
$settings = New-ScheduledTaskSettingsSet `
               -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
               -RestartCount 2 `
               -RestartInterval (New-TimeSpan -Minutes 5) `
               -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action   $action `
    -Trigger  $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Task '$TaskName' registered. Runs every 6 hours." -ForegroundColor Green
Write-Host "To run it immediately: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Cyan
