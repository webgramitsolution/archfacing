# ArchFacing - stop the local Postgres server.
#
# Keep this file plain ASCII - see the note in pg-start.ps1.

$dist = Join-Path $PSScriptRoot "..\.postgres\dist"
$data = Join-Path $PSScriptRoot "..\.postgres\data"

& "$dist\bin\pg_ctl.exe" -D $data -m fast -w stop

Write-Host ""
Write-Host "Postgres stopped."
Write-Host ""
