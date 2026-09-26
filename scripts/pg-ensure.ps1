# ArchFacing - make sure Postgres is up before the dev server starts.
#
# Keep this file plain ASCII - see the note in pg-start.ps1.
#
# This runs automatically from the `predev` script, so `pnpm dev` can never
# again start against a dead database and paint blank pages.

$dist = Join-Path $PSScriptRoot "..\.postgres\dist"
$data = Join-Path $PSScriptRoot "..\.postgres\data"
$log  = Join-Path $PSScriptRoot "..\.postgres\server.log"

& "$dist\bin\pg_ctl.exe" -D $data status *> $null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Postgres is already running." -ForegroundColor DarkGray
    exit 0
}

Write-Host "Postgres is not running - starting it..." -ForegroundColor Yellow
& "$dist\bin\pg_ctl.exe" -D $data -l $log -o "-p 5432" -w start

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Postgres failed to start. Last lines of the log:" -ForegroundColor Red
    if (Test-Path $log) { Get-Content $log -Tail 15 }
    Write-Host ""
    Write-Host "The site will show a database error page until this is fixed." -ForegroundColor Red
    exit 1
}

Write-Host "Postgres is up." -ForegroundColor Green
