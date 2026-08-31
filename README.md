# billkeeper

A small, self-hostable monthly bill tracker. Add your recurring bills once; each month they roll
forward automatically. Mark them paid, jump straight to each biller's payment page, and see what's
left of your bank balance as you pay.

Built with SvelteKit (Svelte 5), Prisma, Postgres, Better Auth, and Tailwind — designed to run
entirely on free tiers (Vercel + a free Postgres).

## Features

- **Monthly rollover** — viewing a new month copies last month's bills in as unpaid
- **One-click pay** — store the biller's payment URL and open it in a new tab
- **Balance tracking** — set a bank balance per month; paid bills subtract from it
- **Autopay awareness** — autopay bills sort below the ones you have to act on
- **Multi-user** — OAuth sign-in (GitHub/Google), every user sees only their own bills
- **Demo mode** — a shared demo account with sample data that resets on each sign-in
- Money is stored as integer cents; no floating-point drift

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

`npm test` runs the unit tests; `npm run check` typechecks; `npm run lint` lints.

## Deploying (free)

1. Create a free Postgres database ([Prisma Postgres](https://www.prisma.io/postgres),
   [Neon](https://neon.tech), or [Supabase](https://supabase.com)).
2. Import the repo into [Vercel](https://vercel.com/new). The default build (`npm run build`) runs
   `prisma generate` automatically.
3. Set the environment variables from `.env.example` in Vercel.
4. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (locally or in CI).
5. Register an OAuth app (GitHub or Google) with callback
   `https://<your-app>/api/auth/callback/<provider>` and add its credentials.

## Architecture

- `src/lib/domain/` — pure, unit-tested logic: money parsing/formatting, month arithmetic, bill
  sorting, form validation
- `src/lib/server/` — Prisma client, Better Auth config, and `bills.ts`, the single service layer
  every route action goes through (all queries are scoped by user id)
- `src/routes/bills/[month]/` — server-rendered page; all mutations are progressive-enhancement
  form actions
- `src/lib/server/banksync/` — seam for read-only bank sync (auto-detecting paid bills from bank
  transactions); see [docs/bank-sync.md](docs/bank-sync.md)

A bill "exists in a month" when it has a `Payment` row for that `YYYY-MM`. Months materialize
lazily on first view by copying the previous month's bills.

## License

[MIT](LICENSE)
