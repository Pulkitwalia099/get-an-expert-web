# midsesh

One-page site: a Mac-style glass chat that matches visitors with human experts. Visitors describe what they need, answer two or three follow-up questions, and pick from live-sourced expert profiles. Every request is logged as structured data.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without API keys the chat runs a scripted demo flow with three sample profiles, so the full experience works out of the box.

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `ANTHROPIC_API_KEY` — powers the intake questions (`claude-opus-4-8`).
- `SERPAPI_KEY` — live profile search across Upwork, Fiverr and the open web (serpapi.com).
- `INSIGHTS_WEBHOOK_URL` — optional. Each brief, intro request and custom need is POSTed here as JSON.

## Deploy

```bash
npx vercel
```

Add the same env vars in the Vercel project settings.

## Design reference

`design/mockup.html` holds the approved static mockup (5 states, switch with keys 1–5).
