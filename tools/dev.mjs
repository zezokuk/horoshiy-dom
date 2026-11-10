// `npm run dev` on any OS: the port comes from PORT (default 3100 — port 3000 is taken by Kimi's own server on Igor's
// machine), the address from HOST. The old script used the shell form ${PORT:-3100}, which Windows does not understand.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const next = createRequire(import.meta.url).resolve('next/dist/bin/next')
const args = [next, 'dev', '--port', process.env.PORT || '3100']
if (process.env.HOST) args.push('--hostname', process.env.HOST)
spawn(process.execPath, args, { stdio: 'inherit' }).on('exit', (code) => process.exit(code ?? 0))
