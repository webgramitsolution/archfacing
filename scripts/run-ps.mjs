/**
 * Runs one of the Windows helper scripts in scripts/*.ps1 — on Windows only.
 *
 *   node scripts/run-ps.mjs pg-ensure.ps1
 *
 * The npm lifecycle hooks (predev / prestart / prebuild) go through this so
 * that `pnpm dev|start|build` also work on Linux hosting and CI, where the
 * portable Postgres in .postgres/ and PowerShell do not exist. Off Windows, or
 * with CI=true / SKIP_PS_HOOKS=1, it does nothing and exits 0.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const script = process.argv[2]
if (!script || !/^[\w-]+\.ps1$/.test(script)) {
  console.error('Usage: node scripts/run-ps.mjs <name>.ps1')
  process.exit(1)
}

if (process.platform !== 'win32' || process.env.CI === 'true' || process.env.SKIP_PS_HOOKS === '1') {
  process.exit(0)
}

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), script)
if (!existsSync(file)) {
  console.error(`scripts/${script} was not found.`)
  process.exit(1)
}

const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file], { stdio: 'inherit' })
process.exit(r.status ?? 1)
