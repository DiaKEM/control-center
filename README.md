# Diakem Notify control center

[![CI](https://github.com/DiaKEM/control-center/actions/workflows/ci.yml/badge.svg)](https://github.com/DiaKEM/control-center/actions/workflows/ci.yml)
[![Backend Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/khskekec/94bfafb7e8622c7446067ba5b6d7e255/raw/diakem-backend-coverage.json)](https://github.com/DiaKEM/control-center/actions/workflows/ci.yml)
[![Frontend Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/khskekec/82dab7be9f7766c4a9303630bdb81d47/raw/diakem-frontend-coverage.json)](https://github.com/DiaKEM/control-center/actions/workflows/ci.yml)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)
[![Node 22](https://img.shields.io/badge/node-22-brightgreen.svg)](https://nodejs.org)

## Project setup

```bash
$ npm install
```
## API documentation

Start the backend and open http://localhost:3000/api/docs.

## Create user

npm run cli create-user admin admin --roles admin,user

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docker

The project ships with a multi-stage `Dockerfile` and three Compose files:

| File | Purpose |
|---|---|
| `docker-compose.mongodb.yml` | Shared MongoDB instance (start this first when using the setup below) |
| `docker-compose.yml` | Production — app container, connects to shared MongoDB |
| `docker-compose.standalone.yml` | Production — self-contained, includes its own MongoDB |
| `docker-compose.dev.yml` | Development — dedicated MongoDB + backend hot-reload + Vite HMR |

Use `docker-compose.yml` + `docker-compose.mongodb.yml` when running multiple app instances that share one database. Use `docker-compose.standalone.yml` for a single self-contained deployment.

### 1. Start MongoDB (once, shared)

Create a `.env` file in the project root (never commit it) and add at minimum:

```bash
MONGO_PASSWORD=your-secure-password
```

Then start MongoDB:

```bash
docker compose -f docker-compose.mongodb.yml up -d
```

MongoDB is now reachable at `localhost:27017` and on the `diakem-network` Docker network under the hostname `mongodb`.

### Development

No `.env` required — credentials are hardcoded for local use. Just run:

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (Vite HMR) | http://localhost:5173 |
| Backend (hot-reload) | http://localhost:3015 |
| MongoDB | localhost:27017 |

Editing files under `backend/src/` or `frontend/src/` triggers hot-reload automatically via bind mounts. `node_modules` stays inside the containers so native modules are compiled for the correct platform.

### Production

#### Single instance

Create a `.env` file in the project root (never commit it):

```bash
MONGO_PASSWORD=your-secure-password
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
# Optional — defaults shown
JWT_EXPIRATION_IN_DAYS=2
APP_PORT=3015
```

Then build and start:

```bash
docker compose up -d --build
```

To create the first admin user:

```bash
docker compose exec app node dist/cli/main.js create-user admin admin --roles admin,user
```

#### Multiple instances

Each instance needs its own port, database name, and Compose project name (the `-p` flag namespaces container names so they don't collide). Create one `.env` file per instance:

**.env.instance-a**
```bash
INSTANCE_NAME=instance-a
MONGO_PASSWORD=your-secure-password
API_KEY=key-a
JWT_SECRET=secret-a
APP_PORT=3015
```

**.env.instance-b**
```bash
INSTANCE_NAME=instance-b
MONGO_PASSWORD=your-secure-password
API_KEY=key-b
JWT_SECRET=secret-b
APP_PORT=3016
```

Start each instance:

```bash
docker compose --env-file .env.instance-a up -d --build
docker compose --env-file .env.instance-b up -d --build
```

To create the first admin user for a specific instance:

```bash
docker compose --env-file .env.instance-a exec app node dist/cli/main.js create-user admin admin --roles admin,user
```

### Standalone (single self-contained instance)

Same `.env` variables as production. No need to start MongoDB separately:

```bash
docker compose -f docker-compose.standalone.yml up -d --build
```

To create the first admin user:

```bash
docker compose -f docker-compose.standalone.yml exec app node dist/cli/main.js create-user admin admin --roles admin,user
```

# Configuration Guide

This guide explains how to obtain the credentials required for each service and add them to your `.env` file.

Copy `.env.example` to `.env` before you start:

```bash
cp .env.example .env
```

---

## Nightscout

### Required variables

```
NIGHTSCOUT_URL=https://your-nightscout-instance.example.com
NIGHTSCOUT_API_KEY=your_api_secret_here
```

### Steps

1. Open your Nightscout instance in a browser.
2. Go to **Admin Tools** → note the URL in your address bar — this is your `NIGHTSCOUT_URL` (e.g. `https://mysite.fly.dev`).
3. Your `NIGHTSCOUT_API_KEY` is the **API Secret** you chose when setting up Nightscout.
    - You can find or change it under **Admin Tools** → **Profile Editor** or in your hosting provider's environment variables (`API_SECRET`).
4. Enter the plain-text value — the application hashes it automatically before sending it to the API.

### Verify

```bash
npm run test:check-nightscout-api
```

---

## Pushover

### Required variables

```
PUSHOVER_APP_TOKEN=your_pushover_app_token_here
PUSHOVER_USER_KEY=your_pushover_user_key_here
```

### Steps

#### User Key

1. Log in at [pushover.net](https://pushover.net).
2. Your **User Key** is displayed on the dashboard under your name.
   Copy it into `PUSHOVER_USER_KEY`.

#### App Token

1. Scroll down to **Your Applications** on the dashboard and click **Create an Application/API Token**.
2. Fill in a name (e.g. `diakem-notify`) and accept the terms.
3. Copy the generated **API Token/Key** into `PUSHOVER_APP_TOKEN`.

#### Receiving device

Install the **Pushover** app on your Android device and log in with the same account. The app must be installed for notifications to be delivered.

### Verify

```bash
npm run test:check-pushover-api
```

---

## Telegram

### Required variables

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

### Steps

#### Bot Token

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot` and follow the prompts to choose a name and username.
3. BotFather will reply with a token in the format `123456789:ABCdef...`.
   Copy it into `TELEGRAM_BOT_TOKEN`.

#### Chat ID

You need the numeric ID of the chat (private chat, group, or channel) where the bot should send messages.

**For a private chat:**

1. Start a conversation with your bot by searching for its username and pressing **Start**.
2. Send any message to the bot.
3. Open the following URL in your browser (replace `<TOKEN>` with your bot token):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
4. Find the `"chat"` object in the response — the `"id"` field is your `TELEGRAM_CHAT_ID`.

**For a group or channel:**

1. Add the bot to the group or channel as an administrator.
2. Send a message in the group/channel by mentioning the bot directly via `/test @<BOT_USERNAME>`.
3. Call `getUpdates` as above and look for the `"chat"."id"` field.
   Group/channel IDs are negative numbers (e.g. `-1001234567890`).

### Verify

```bash
npm run test:check-telegram-api
```

The connection check sends a test message to the configured chat — you should see it arrive on your device.

## CLI
The CLI is a simple command-line interface that allows you to run specific jobs.
Usage:
### development
npm run cli -- run:all
npm run cli -- run pump-age

### production (after nest build)
npm run cli:prod -- run:all
npm run cli:prod -- run pump-age

The CliModule is intentionally separate from AppModule — it doesn't load the HTTP server, guards, or any web-related modules. It only boots what's needed to resolve job types and persist executions.

## Notificators

## Low Battery

Check if the battery is low and send a notification:

Make threshold configurable: 51%
Each 15 Minutes
Below: 30%
Each 5 Minutes
Below: 15
Each 1 Minute

One time static at 20:00

## Low insulin

Low insulin threshold: 80IE
Each 5 hours
Below: 50IE
Each 1 hour
Below: 25
Each 30 minutes

One time static at 20:00

## Pump change

Notify if pump is older than 4 days.
All 5 hours.
One time static at 20:00.
Older than 4.5 days:
All 2 hours.
Older than 5 days:
All 1 hour.
Older than 6 days:
All 30 minutes.

## Sensor expiration
Older than 7 days:
All 3 hours
Older than 8 days:
All 2 hours
Older than 8.75 days:
All 1 hour
Older than 10 days:

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
