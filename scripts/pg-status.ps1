# ArchFacing - is the local Postgres server up?
#
# Keep this file plain ASCII - see the note in pg-start.ps1.

$dist = Join-Path $PSScriptRoot "..\.postgres\dist"
$data = Join-Path $PSScriptRoot "..\.postgres\data"
$log  = Join-Path $PSScriptRoot "..\.postgres\server.log"

& "$dist\bin\pg_ctl.exe" -D $data status

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Postgres is NOT running. Start it with:  pnpm pg:start" -ForegroundColor Yellow
    Write-Host "Last lines of the log:"
    if (Test-Path $log) { Get-Content $log -Tail 10 }
}
