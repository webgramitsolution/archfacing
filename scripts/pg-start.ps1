# ArchFacing - start the local Postgres server.
#
# Keep this file plain ASCII. Windows PowerShell 5.1 reads a .ps1 as ANSI
# unless it carries a UTF-8 BOM, so any non-ASCII character here is decoded
# as the wrong bytes and can break string parsing - which is exactly what
# happened when this file had a comment in Devanagari.

$dist = Join-Path $PSScriptRoot "..\.postgres\dist"
$data = Join-Path $PSScriptRoot "..\.postgres\data"
$log  = Join-Path $PSScriptRoot "..\.postgres\server.log"

& "$dist\bin\pg_ctl.exe" -D $data -l $log -o "-p 5432" -w start

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Postgres did not start. Last lines of the log:" -ForegroundColor Red
    if (Test-Path $log) { Get-Content $log -Tail 15 }
    exit 1
}

Write-Host ""
Write-Host "Postgres is up - postgresql://archfacing:archfacing_dev@127.0.0.1:5432/archfacing"
Write-Host ""
