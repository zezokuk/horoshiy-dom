// Keeps the shared branch current for everyone (30.10), see СЕЙЧАС.md and README → «Как всё держится актуальным».
//   node tools/sync.mjs push     commit what changed, check the types, take the others' commits, send (Ilya's machine)
//   node tools/sync.mjs live     watch the branch and bring new commits in, the dev server shows them at once (Igor's machine)
//   node tools/sync.mjs install  send after every commit, from VS Code too (once per machine)
// Never touches main, never forces a push: whatever it can't send safely stays local and the reason is printed.
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const BRANCH = 'redesign-v2'
const JOURNAL = 'СЕЙЧАС.md'
const START = '<!-- auto:start -->'
const END = '<!-- auto:end -->'
const NAMES = { 'Ilia Berdnikov': 'Илья', zezokuk: 'Игорь' }
const MAX_MB = 50
const MAX_DELETED = 30
const FORBIDDEN = [/(^|\/)\.env$/, /(^|\/)\.env\.(?!example$)/, /\.(db|sqlite|pem|key)$/, /\.db\./, /ЛИЧНОЕ-/]
const SECRET = /gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY/

// a post-commit hook runs with git's own variables set, they would point the nested commands at the hook's index
const env = { ...process.env, HD_SYNC: '1' }
for (const k of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_WORK_TREE']) delete env[k]

const git = (...args) => {
  const r = spawnSync('git', ['-c', 'core.quotepath=off', ...args], { encoding: 'utf8', env, maxBuffer: 1 << 28 })
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }
}
const top = git('rev-parse', '--show-toplevel')
if (!top.ok) {
  console.error('Запускать из папки репозитория')
  process.exit(0)
}
process.chdir(top.out)
const gitDir = git('rev-parse', '--absolute-git-dir').out
const lines = (s) => s.split('\n').filter(Boolean)
const remote = () => {
  const row = git('remote', '-v').out.split('\n').find((l) => /horoshiy-dom/.test(l) && /\(fetch\)/.test(l))
  return row ? row.split(/\s+/)[0] : null
}

const asJson = process.argv.includes('--claude')
function say(text) {
  appendFileSync(join(gitDir, 'hd-sync.log'), `${new Date().toISOString()} ${text}\n`)
  // ASCII only: Windows PowerShell re-encodes what passes through it and would break the Russian text
  if (asJson) console.log(JSON.stringify({ systemMessage: text }).replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`))
  else console.log(text)
}
const quiet = (text) => appendFileSync(join(gitDir, 'hd-sync.log'), `${new Date().toISOString()} ${text}\n`)

// two sends at once (a commit during the Stop hook) would fight over the index
const LOCK = join(gitDir, 'hd-sync.lock')
function lock() {
  if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs > 5 * 60_000) unlinkSync(LOCK)
  try {
    writeFileSync(LOCK, String(process.pid), { flag: 'wx' })
    return true
  } catch {
    return false
  }
}

/** Reasons not to send what lies between the shared base and the index: secrets, huge files, a mass deletion. */
function guard(base) {
  const names = lines(`${git('log', '--name-status', '--format=', `${base}..HEAD`).out}\n${git('diff', '--cached', '--name-status', base).out}`).map((l) => l.split('\t').pop())
  const bad = [...new Set(names)].filter((n) => FORBIDDEN.some((re) => re.test(n)))
  if (bad.length) return `закрытые файлы: ${bad.slice(0, 3).join(', ')}`
  const big = [...new Set(names)].filter((n) => existsSync(n) && statSync(n).size > MAX_MB * 1024 * 1024)
  if (big.length) return `файлы больше ${MAX_MB} МБ: ${big.slice(0, 3).join(', ')}`
  const gone = lines(git('diff', '--cached', '--name-status', '--diff-filter=D', base).out).length
  if (gone > MAX_DELETED) return `удалено слишком много файлов (${gone}), проверьте вручную`
  const patch = `${git('log', '-p', '--format=', `${base}..HEAD`).out}\n${git('diff', '--cached', '-U0', base).out}`
  if (patch.split('\n').some((l) => l.startsWith('+') && SECRET.test(l))) return 'в изменениях похоже на ключ или токен'
  return null
}

function typeErrors() {
  const tsc = join('node_modules', 'typescript', 'bin', 'tsc')
  if (!existsSync(tsc)) return null
  const r = spawnSync(process.execPath, [tsc, '--noEmit'], { encoding: 'utf8', env, maxBuffer: 1 << 26 })
  return r.status === 0 ? null : lines(r.stdout || r.stderr || 'tsc упал').slice(0, 2).join(' | ')
}

function autoMessage() {
  const files = lines(git('diff', '--cached', '--name-only').out).map((f) => basename(f))
  const shown = files.slice(0, 4).join(', ')
  return `Автосохранение: ${shown}${files.length > 4 ? ` и ещё ${files.length - 4}` : ''}`
}

/** The journal is built from the history, the only place that can't go stale; the hand-written top of the file is kept. */
function writeJournal() {
  const raw = git('log', '-n', '30', '--date=format:%d.%m', '--format=%x01%ad%x02%an%x02%s', '--name-only').out
  const rows = raw.split('\x01').filter(Boolean).map((c) => {
    const [head, ...rest] = c.split('\n')
    const [date, who, subject] = head.split('\x02')
    const files = rest.filter((f) => f && f !== JOURNAL).map((f) => basename(f))
    const short = subject.length > 170 ? `${subject.slice(0, 170)}…` : subject
    const list = files.length ? ` _(${files.slice(0, 4).join(', ')}${files.length > 4 ? ` и ещё ${files.length - 4}` : ''})_` : ''
    return `- ${date} · ${NAMES[who] || who} · ${short}${list}`
  })
  const block = `${START}\n${rows.join('\n')}\n${END}`
  const was = existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : `# Что сейчас в проекте\n\n${START}\n${END}\n`
  const at = was.indexOf(START)
  const to = was.indexOf(END)
  const next = at >= 0 && to > at ? was.slice(0, at) + block + was.slice(to + END.length) : `${was.trimEnd()}\n\n${block}\n`
  if (next === was) return false
  writeFileSync(JOURNAL, next)
  return true
}

function send() {
  const branch = git('branch', '--show-current').out
  if (branch !== BRANCH) return quiet(`skip: branch ${branch || '(detached)'}`)
  if (['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'rebase-merge', 'rebase-apply'].some((f) => existsSync(join(gitDir, f)))) return say('Не отправлено: в репозитории незавершённое слияние')
  const rem = remote()
  if (!rem) return say('Не отправлено: не найден адрес репозитория horoshiy-dom')
  const tip = `${rem}/${BRANCH}`
  const fetched = git('fetch', '-q', rem, BRANCH)
  if (!fetched.ok) return say(`Не отправлено: нет связи с GitHub (${lines(fetched.err)[0] || 'fetch'}). Отправится при следующем сохранении`)

  // after a commit by hand only the commit goes: files left out of it may be half done
  const dirty = !process.argv.includes('--only-commits') && git('status', '--porcelain').out !== ''
  const rebase = () => git('rebase', '-q', '--autostash', tip).ok
  const count = (range) => Number(git('rev-list', '--count', range).out || 0)
  if (!dirty && !count(`${tip}..HEAD`)) {
    if (count(`HEAD..${tip}`)) {
      const came = git('merge', '--ff-only', '-q', tip)
      quiet(came.ok ? 'pulled' : `pull failed: ${came.err}`)
    } else quiet('clean')
    return
  }

  if (dirty) git('add', '-A')
  const base = git('merge-base', 'HEAD', tip).out
  const stop = guard(base) || (() => { const e = typeErrors(); return e && `ошибки типов: ${e}` })()
  if (stop) {
    if (dirty) git('reset', '-q')
    return say(`Не отправлено, ${stop}. Правки на месте, отправятся после исправления`)
  }
  if (dirty) {
    const done = git('commit', '-q', '-m', autoMessage())
    if (!done.ok) return say(`Не отправлено: коммит не прошёл (${lines(done.err)[0] || ''})`)
  }

  // Igor's commits go under ours; a conflict is left for a person, nothing is overwritten
  if (count(`HEAD..${tip}`) && !rebase()) {
    git('rebase', '--abort')
    return say(`Не отправлено: правки пересеклись с чужими в ${BRANCH}. Коммит сохранён у вас, нужно слить вручную`)
  }
  if (writeJournal()) {
    git('add', '--', JOURNAL)
    git('commit', '-q', '--amend', '--no-edit', '--', JOURNAL)
  }
  let pushed = git('push', '-q', rem, BRANCH)
  if (!pushed.ok && git('fetch', '-q', rem, BRANCH).ok && rebase()) pushed = git('push', '-q', rem, BRANCH)
  if (!pushed.ok) {
    if (existsSync(join(gitDir, 'rebase-merge'))) git('rebase', '--abort')
    return say(`Не отправлено: ${lines(pushed.err)[0] || 'push не прошёл'}. Коммит сохранён у вас`)
  }
  say(`В репозитории (${BRANCH}): ${git('log', '-1', '--format=%s').out.slice(0, 120)}`)
}

function push() {
  if (!lock()) return quiet('skip: another send is running')
  try {
    send()
  } finally {
    unlinkSync(LOCK)
  }
}

async function live() {
  const rem = remote()
  if (!rem) return console.error('Не найден адрес репозитория horoshiy-dom')
  const tip = `${rem}/${BRANCH}`
  console.log(`Слежу за ${BRANCH}: новые правки приходят каждые 30 секунд. Остановить: Ctrl+C`)
  let told = ''
  for (;;) {
    if (git('fetch', '-q', rem, BRANCH).ok) {
      const head = git('rev-parse', tip).out
      const fresh = lines(git('log', '--format=%s', `HEAD..${tip}`).out)
      if (fresh.length && head !== told) {
        console.log(`\n${new Date().toLocaleTimeString('ru-RU')} — новых правок: ${fresh.length}`)
        for (const s of fresh.slice(0, 5)) console.log(`  • ${s.slice(0, 120)}`)
        if (git('branch', '--show-current').out === BRANCH) {
          const deps = git('diff', '--name-only', 'HEAD', tip, '--', 'package-lock.json').out
          const came = git('merge', '--ff-only', '-q', tip)
          if (came.ok) {
            console.log('  Уже у вас, страница обновится сама.')
            if (deps) spawnSync('npm', ['install'], { stdio: 'inherit', shell: true })
          } else console.log(`  Не подтянул: мешают ваши правки. Сохраните их и выполните git pull --rebase ${rem} ${BRANCH}`)
        } else console.log(`  Вы в другой ветке. Забрать: git merge ${tip}`)
        told = head
      }
    }
    await new Promise((r) => setTimeout(r, 30_000))
  }
}

function install() {
  const hook = join(gitDir, 'hooks', 'post-commit')
  writeFileSync(hook, '#!/bin/sh\n[ -n "$HD_SYNC" ] && exit 0\nexec node tools/sync.mjs push --only-commits\n', { mode: 0o755 })
  console.log(`Готово: каждый коммит в ${BRANCH} сразу уходит в репозиторий`)
}

const mode = process.argv[2]
if (mode === 'push') push()
else if (mode === 'live') live()
else if (mode === 'install') install()
else console.log('node tools/sync.mjs push | live | install')
