# Запуск сайта на сервере

Для кого: тот, кто разворачивает сайт «Хорошего дома» у клиента (Илья или нанятый админ). Время — около 2 часов.

## Что нужно от клиента

- **Домен** на юрлицо клиента (например, `horoshiy-dom.ru`) и доступ к его DNS.
- **Сервер в России** — по 152-ФЗ заявки хранятся в РФ. Подойдёт любой VPS: Timeweb Cloud, Selectel, Yandex Cloud, REG.RU. Нужно 2 ядра, 4 ГБ памяти, 30 ГБ диска, Ubuntu 22.04 или 24.04. Аренда — около 800–1500 ₽ в месяц, на клиента.
- **Ключи подключений** — полный список в [КАК-ПРАВИТЬ.md](КАК-ПРАВИТЬ.md), раздел 1а. Это Telegram-бот, amoCRM, Метрика и пиксель VK.

## Шаги

1. **DNS.** Создать A-записи `@`, `www` и `*` (поддомены регионов: `krd.`, `msk.`) на IP сервера.
2. **Node 22 и nginx** на сервере:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs nginx python3
   ```
3. **Код и данные.** Скопировать папку `platform/` без `node_modules` и `.next`. Вместе с ней перенести `platform.db` и `media/` — это все дома, фото и настройки из админки.
4. **`.env`** — по образцу `.env.example`:
   - `NEXT_PUBLIC_ROOT_DOMAIN=horoshiy-dom.ru`;
   - `PAYLOAD_SECRET` — новая длинная случайная строка;
   - `NEXT_PUBLIC_INDEX=1` — открыть сайт поисковикам;
   - ключи Telegram, amoCRM, Метрики и VK.
5. **Сборка и запуск:**
   ```bash
   npm ci && npm run build
   sudo npm i -g pm2 && pm2 start "npm start" --name horoshiy && pm2 save && pm2 startup
   ```
6. **nginx** проксирует на `127.0.0.1:3000` и передаёт настоящий IP посетителя (по нему работает лимит заявок 5 за 10 минут):
   ```nginx
   server {
     server_name horoshiy-dom.ru *.horoshiy-dom.ru;
     client_max_body_size 200m;            # видео комнат из админки
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;        # поддомен региона
       proxy_set_header X-Forwarded-For $remote_addr;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
7. **HTTPS.** Сертификат на `*.horoshiy-dom.ru` выпускается только через DNS-проверку:
   ```bash
   sudo certbot --nginx -d horoshiy-dom.ru -d '*.horoshiy-dom.ru' --manual --preferred-challenges dns
   ```
   Другой вариант — бесплатный сертификат у хостера.
8. **Бэкап каждый день в 4:00** — база и фото с проверкой восстановления, хранятся 14 дней:
   ```bash
   crontab -e
   0 4 * * * cd /srv/platform && python3 tools/backup.py >> backups/log.txt 2>&1
   ```
   Раз в неделю копировать папку `backups/` с сервера в облако клиента: если сервер пропадёт, вместе с ним пропадут и бэкапы.
9. **Мониторинг доступности** — бесплатно в UptimeRobot или Яндекс Мониторинге. Проверять `https://horoshiy-dom.ru/` и `https://krd.horoshiy-dom.ru/`, уведомления — в Telegram.

## Проверка после запуска

- `https://horoshiy-dom.ru/`, `https://krd.horoshiy-dom.ru/`, `https://krd.horoshiy-dom.ru/p/dinskaya` открываются по HTTPS.
- Тестовая заявка с телефона:
  - видна в админке;
  - пришла в Telegram;
  - в amoCRM появилась сделка;
  - после проверки удалить её в админке и в amoCRM.
- В Метрике видна цель `lead_submit` («Посещения в реальном времени»).
- В Яндекс Вебмастере добавлены сайт и каждый поддомен региона, указаны sitemap (`/sitemap.xml` на каждом) и регион.
- `python3 tools/backup.py` пишет `restore check: OK`.

## Обновление сайта

1. Сделать бэкап: `python3 tools/backup.py`.
2. Загрузить новые файлы кода, не трогая `platform.db` и `media/`.
3. **Если в обновлении менялись поля в админке** (это видно по `src/collections/*.ts`), сначала обновить схему базы. В рабочем режиме Payload сам этого не делает. Поэтому один раз запустить `npm run dev`, дождаться строки `Ready`, открыть `/admin` и остановить сервер (Ctrl+C).
   - Если Payload пишет `index … already exists`: удалить индексы таблицы `payload_locked_documents_rels` — это служебная таблица блокировок, данных в ней нет. Затем повторить шаг 3. Так было 19.10, подробности в `HANDOFF-4-платформа.md`.
4. `npm ci && npm run build && pm2 restart horoshiy`.

Когда правок станет больше, перейти на миграции Payload (`payload migrate:create` / `payload migrate`), чтобы схема менялась без dev-режима на сервере.
