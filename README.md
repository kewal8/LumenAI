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
npm run dev
```

Keys needed: `DEEPGRAM_API_KEY` (role Member or higher) and `ANTHROPIC_API_KEY`.

## Deploy

Set `APP_PASSWORD` along with the two keys. Without it a deployed app stays
locked. Everyone you give the password to shares one login.

Do not use real patient data: there are no per-user accounts or data
agreements with the speech and AI providers yet.
