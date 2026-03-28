# Diakem Notify control center

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

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

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
