# Monkey Dynasty Mini App

Мини-приложение с фронтом на TypeScript и бэкендом на Python (AsyncIO, aiogram, FastAPI, PostgreSQL).

## Что уже сделано

- мобильный интерфейс mini app
- нижний tab bar с вкладками: миниигры, инвентарь, кейсы, рейтинг, профиль
- кейсы открываются по умолчанию
- асинхронный backend на FastAPI
- подключение к PostgreSQL через SQLAlchemy/asyncpg
- базовая интеграция с aiogram для Telegram bot

## Старт локально

1. Создайте .env на основе .env.example.
2. Запустите PostgreSQL:
   ```bash
   docker compose up -d postgres
   ```
3. Установите зависимости Python:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   .\.venv\Scripts\Activate.ps1  # Windows PowerShell
   pip install -r backend/requirements.txt
   ```
4. Запустите бэкенд:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
5. В другом окне:
   ```bash
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

После этого приложение доступно по адресу:
- frontend: http://localhost:5173
- backend: http://localhost:8000

## Запуск на сервере с доменом

Production-конфигурация использует существующий Nginx на сервере: frontend и backend публикуются только на localhost-порты, чтобы не конфликтовать с другими ботами и Mini App.

1. Направьте DNS-запись `A` домена `test.monkeysdynasty.website` на публичный IP сервера. На сервере откройте TCP-порты `80` и `443`.
2. Установите Docker с Compose plugin и скопируйте проект на сервер.
3. В корне проекта создайте `.env`:
   ```env
   APP_TITLE=Monkey Dynasty Mini App
   ENVIRONMENT=production
   FRONTEND_URL=https://test.monkeysdynasty.website
   BACKEND_URL=https://test.monkeysdynasty.website
   BOT_TOKEN=ваш_токен_бота
   SECRET_KEY=длинный_случайный_секрет
   ```
   `DATABASE_URL` можно не указывать: Compose задаёт адрес PostgreSQL внутри сети Docker.
4. Запустите контейнеры приложения:
   ```bash
   docker compose up -d --build
   ```
5. Добавьте в существующий Nginx временный HTTP server block:
   ```nginx
   server {
      listen 80;
      server_name test.monkeysdynasty.website;

      location /api/ {
         proxy_pass http://127.0.0.1:8001;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
      }

      location /health {
         proxy_pass http://127.0.0.1:8001;
         proxy_set_header Host $host;
         proxy_set_header X-Forwarded-Proto $scheme;
      }

      location / {
         proxy_pass http://127.0.0.1:5173;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
      }
   }
   ```
      Проверьте и перечитайте Nginx:
      ```bash
      sudo nginx -t && sudo systemctl reload nginx
      ```
   Получить сертификат можно через Certbot, если его ещё нет:
   ```bash
   sudo certbot --nginx -d test.monkeysdynasty.website
   ```
      Certbot сам добавит HTTPS и перенаправление с HTTP. Если сертификат уже существует, сразу добавьте SSL-настройки в этот server block.
6. Проверьте:
   ```bash
   docker compose ps
   curl https://test.monkeysdynasty.website/health
   ```

После этого Mini App открывается именно по адресу `https://test.monkeysdynasty.website`. Существующий Nginx продолжает обслуживать остальные приложения.

В BotFather укажите этот же URL в настройках Web App / Menu Button: `https://test.monkeysdynasty.website`.

Для просмотра логов используйте `docker compose logs -f backend frontend`, для остановки — `docker compose down`.

## Основные папки

- backend/ - Python API и bot
- frontend/ - TypeScript + Vite + React приложение
- docker-compose.yml - Postgres и предварительная сборка контейнеров
