// `npm run dev` on any OS. The port: PORT if set, else the port of NEXT_PUBLIC_ROOT_DOMAIN in .env.local / .env (the
// site's own links lead there, so the server must listen on it), else 3100 (3000 is taken by Kimi's server on Igor's
// machine). The address: HOST. The old script used the shell form ${PORT:-3100}, which Windows does not understand.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const envPort = () => {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    const port = readFileSync(file, 'utf8').match(/^NEXT_PUBLIC_ROOT_DOMAIN=.*:(\d+)\s*$/m)?.[1]
    if (port) return port
  }
}
const next = createRequire(import.meta.url).resolve('next/dist/bin/next')
const args = [next, 'dev', '--port', process.env.PORT || envPort() || '3100']
if (process.env.HOST) args.push('--hostname', process.env.HOST)
spawn(process.execPath, args, { stdio: 'inherit' }).on('exit', (code) => process.exit(code ?? 0))
