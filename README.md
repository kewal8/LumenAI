# LumenAI

AI reporting assistant for radiologists. Dictate only the abnormal findings;
the report is written in your template and copied ready to paste into PACS.

## Pages

- `/report` – dictate or type findings, get the report and impression
- `/dictate` – speech recognition accuracy test
- `/paste-test` – check formatting survives pasting into a PACS editor

## Run locally

```bash
cp .env.example .env.local   # then fill in the keys
npm install
npm run db:migrate           # creates the tables
npm run dev
```

Needed in `.env.local`: `DATABASE_URL` (Neon Postgres), `DEEPGRAM_API_KEY`
(role Member or higher) and `ANTHROPIC_API_KEY`.

## Accounts

Sign-up is by invitation only. Create an invite and send the printed link:

```bash
npm run invite -- you@example.com --admin               # yourself, first
npm run invite -- doctor@example.com                    # a solo radiologist
npm run invite -- owner@centre.com --org "Centre name"  # a diagnostic centre
```

Once someone is signed in, owners and admins invite further people from the
Team screen. Each account belongs to an organisation; a solo radiologist is an organisation
of one. Passwords are stored hashed (scrypt) and sessions last 30 days.

Password-reset emails need `RESEND_API_KEY` and `EMAIL_FROM`. Without them the
reset link is written to the server log.

## Deploy

Set `DATABASE_URL`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY` and `APP_URL` in
Vercel, then run `npm run db:migrate` once against the production database.

Do not use real patient data: there are no data agreements with the speech and
AI providers yet.
