# Refuses to build while a dev server is running on port 3000.
#
# `next dev` and `next build` both write to .next. Building on top of a
# running dev server replaces the chunks it has already handed to the
# browser, so every later request 404s and the page dies with a bare
# "[object Event]" -- an error that looks like an application bug and is not
# one. Cleaning up costs a wiped .next and a restart, so it is cheaper to
# stop here.

$listening = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue

if ($listening) {
    $procId = ($listening | Select-Object -First 1).OwningProcess
    Write-Host ""
    Write-Host "  Build stopped: something is already serving on port 3000 (PID $procId)." -ForegroundColor Red
    Write-Host ""
    Write-Host "  'next dev' and 'next build' share the .next folder. Building now would"
    Write-Host "  break the running server's chunks and the page would 404 on reload."
    Write-Host ""
    Write-Host "  Stop it first:  Stop-Process -Id $procId -Force"
    Write-Host ""
    exit 1
}

exit 0
