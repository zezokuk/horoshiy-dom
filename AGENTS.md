<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Перед любой задачей

Забери свежую ветку `redesign-v2` (в `main` лежит старая версия) и прочитай [СЕЙЧАС.md](СЕЙЧАС.md): кто что делает, чьи файлы и что поменялось. Правила для нейросети Игоря — [KIMI.md](KIMI.md).

Ветка `redesign-v2` отправляется в репозиторий автоматически (`tools/sync.mjs`): на компьютере Ильи при завершении работы Claude и после каждого коммита. Коммить законченные куски сам и с понятным сообщением по-русски, иначе в журнал попадёт безличное «Автосохранение». Вручную `git push` не нужен. Поменялось, кто что делает или чего ждём, — поправь верхнюю часть СЕЙЧАС.md: список изменений внизу строится сам, а она нет.
