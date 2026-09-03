# billkeeper

A small, self-hostable monthly bill tracker for a household. Add your recurring bills once; each
month they roll forward automatically. Mark them paid (or let bank sync do it), jump straight to
each biller's payment page, and see what's left of your bank balance as you pay.

Built with SvelteKit (Svelte 5), Prisma, Postgres, Better Auth, and Tailwind — designed to run
entirely on free tiers, plus one optional $1.50/mo bank-sync subscription.

## Services you'll need

| Service                                                                                                                            | What it's for                                              | Sign up                   | Cost         |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------- | ------------ |
| [Vercel](https://vercel.com/signup)                                                                                                | Hosting + the daily sync/reminder cron                     | vercel.com/signup         | Free (Hobby) |
| [Prisma Postgres](https://console.prisma.io)                                                                                       | The database                                               | console.prisma.io         | Free tier    |
| [GitHub OAuth app](https://github.com/settings/developers) or [Google OAuth client](https://console.cloud.google.com/auth/clients) | Sign-in (either one is enough)                             | —                         | Free         |
| [SimpleFIN Bridge](https://beta-bridge.simplefin.org) _(optional)_                                                                 | Read-only bank sync: auto-detect paid bills, live balances | beta-bridge.simplefin.org | $1.50/mo     |
| [Resend](https://resend.com/signup) _(optional)_                                                                                   | Due-reminder emails (and texts via carrier gateways)       | resend.com/signup         | Free tier    |

Alternatives, if a service doesn't work out (each integration sits behind a small seam, so
swapping is a contained change — a capable AI coding assistant can do it from this repo alone):

- **Database** — any Postgres works: [Neon](https://neon.tech), [Supabase](https://supabase.com).
  Only `DATABASE_URL` changes.
- **Bank sync** — [Teller](https://teller.io) is free for 100 connections but signup is not
  self-serve (as of late 2026); a Teller provider would slot in beside
  `src/lib/server/banksync/simplefin.ts`. Or skip bank sync entirely — everything else works with
  manual mark-as-paid.
- **Email** — Resend is one `fetch` call in `src/lib/server/notify.ts`; Postmark/SES/SMTP are
  drop-in replacements there. Without a key, reminders are simply disabled.
- **Hosting** — anything SvelteKit supports via adapters; you'd swap `adapter-vercel` and find a
  replacement for the cron entry in `vercel.json`.

### Quick reference (where to log in later)

| I want to…                                                                        | Go to                                                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| See deploys, env vars, cron runs                                                  | [vercel.com dashboard](https://vercel.com/dashboard) → your project                                               |
| Manage the database / run queries                                                 | [console.prisma.io](https://console.prisma.io)                                                                    |
| Add/remove bank accounts feeding sync, revoke app access                          | [beta-bridge.simplefin.org](https://beta-bridge.simplefin.org) — issue a new **setup token** here if reconnecting |
| Check reminder email delivery, rotate API key, verify a domain                    | [resend.com](https://resend.com)                                                                                  |
| Edit the GitHub sign-in app                                                       | [github.com/settings/developers](https://github.com/settings/developers)                                          |
| Edit the Google sign-in app / test users                                          | [console.cloud.google.com → Google Auth Platform](https://console.cloud.google.com/auth/overview)                 |
| Connect/disconnect the bank inside the app, reminder recipients, household access | the app's **Settings** page                                                                                       |

## Features

**Bills**

- **Monthly rollover** — each new month starts with every bill unpaid; a bill stays in play
  until you delete it
- **Three sections** — To pay, Autopay, and Paid (everything settled sinks to the bottom),
  sortable by due date or A–Z
- **Inline amounts** — click an unpaid bill's amount to edit it in place
- **One-click pay** — store the biller's payment URL and open it in a new tab
- **Due reminders** — per-bill "remind me N days before due"; a daily cron emails you (and any
  address on the Settings page — carrier email-to-text gateways make that a free SMS). Paid bills
  never remind; each bill reminds at most once a month
- Money is stored as integer cents; no floating-point drift

**Bank sync** (optional, via SimpleFIN)

- **Auto-detect payments** — sync matches this month's outgoing transactions against unpaid bills
  (amount ±$1 + payee); confident matches are marked paid, near-misses become one-click
  suggestions
- **Scoped matching** — pick which account payments are matched from; sync still refreshes every
  account's balance
- **Daily auto-sync** — the daily cron refreshes every connected user's balances and payment
  matching before reminders go out (so a bill the bank shows as paid never gets a reminder).
  It never touches the month's balance — set or reset that yourself. SimpleFIN itself caches
  bank data and refreshes roughly daily, so balances can lag your bank by up to a day
- **Balance tracking** — the month's balance can come straight from your checking account (or be
  set by hand), and only bills paid _after_ that snapshot deduct from it
- **Linked accounts** — link a bill (say, a credit card) to an account and its live balance shows
  under the bill's amount; the amount itself stays whatever you set

**Accounts & sharing**

- **Multi-user** — OAuth sign-in (GitHub/Google); the same email via either provider is one user
- **Household sharing** — grant an email full access to your bills, sync, and reminders from
  Settings; their header shows whose household they're in
- **Demo mode** — a shared demo account with sample data that resets on each sign-in

## Local development

```bash
npm install
cp .env.example .env    # then fill it in (see comments in the file)
npm run db:dev          # starts a local Postgres, prints its DATABASE_URL
```

In a second terminal, with `DATABASE_URL` set in `.env`:

```bash
npm run db:migrate      # create tables
npm run db:seed         # optional: seed the demo user + sample bills
npm run dev
```

`npm test` runs the unit tests; `npm run check` typechecks; `npm run lint` lints. Bank sync can be
exercised without a real bank — see [docs/bank-sync.md](docs/bank-sync.md) for the public demo
access URL.

## Deploying (free)

1. Create a free Postgres database (see table above).
2. Import the repo into [Vercel](https://vercel.com/new). The default build (`npm run build`) runs
   `prisma generate` automatically; `vercel.json` registers the daily reminder cron.
3. Set the environment variables from `.env.example` in Vercel — at minimum `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `DEMO_EMAIL`/`DEMO_PASSWORD`, and `CRON_SECRET`; add `RESEND_API_KEY` +
   `EMAIL_FROM` for reminders.
4. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (locally or in CI).
5. Register an OAuth app (GitHub or Google) with callback
   `https://<your-app>/api/auth/callback/<provider>` and add its credentials.
6. For bank sync: subscribe on the SimpleFIN Bridge, connect your bank(s) there, create an app
   connection, and paste its setup token into the app's Settings → Bank sync.

## Architecture

- `src/lib/domain/` — pure, unit-tested logic: money, month arithmetic, bill sorting/sections,
  transaction↔bill matching, reminder scheduling, validation
- `src/lib/server/` — Prisma client, Better Auth config, `bills.ts` (the single service layer all
  route actions go through; every query scoped by user id), `notify.ts` (reminder engine)
- `src/lib/server/banksync/` — SimpleFIN protocol client, sync orchestration, connection/account
  management; see [docs/bank-sync.md](docs/bank-sync.md)
- `src/routes/bills/[month]/` — server-rendered month page; all mutations are
  progressive-enhancement form actions
- `src/routes/settings/` — bank connection, reminder recipients, household sharing
- `src/routes/api/cron/reminders/` — daily Vercel cron endpoint: bank sync + reminders (guarded by `CRON_SECRET`)
- Household sharing resolves in `hooks.server.ts`: a session whose email matches an
  `AccountShare` operates on the owner's data (`locals.dataUserId`)

A bill "exists in a month" when it has a `Payment` row for that `YYYY-MM`. Months materialize
lazily on first view by copying the previous month's bills.

## License

[MIT](LICENSE)
