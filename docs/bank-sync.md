# Bank sync (planned)

Goal: stop marking bills paid by hand. Connect a checking account read-only, pull recent
transactions, and match them against this month's bills.

Explicitly out of scope: initiating payments. Payment-initiation APIs require business
partnerships; billkeeper only ever reads transactions.

## Providers

| Provider                                              | Cost                            | Notes                                                     |
| ----------------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| [Teller](https://teller.io)                           | Free up to 100 live connections | US only; first implementation target                      |
| [SimpleFIN Bridge](https://beta-bridge.simplefin.org) | $1.50/mo paid by the user       | Protocol is an open standard; user brings their own token |

Both fit the `BankSyncProvider` interface in `src/lib/server/banksync/`:

- `completeConnection(payload)` — exchange the provider's connect-flow result for a storable
  secret (Teller: enrollment access token; SimpleFIN: claimed access URL)
- `listTransactions(connection, since)` — normalized read-only transactions

Connections are stored per user in the `BankConnection` table (`status`, `secret`).

## Matching sketch

For each unpaid bill in the current month with a `minPaymentCents`:

1. Pull transactions since the start of the month.
2. Candidate match: amount within ±$1 of `minPaymentCents` (bills like utilities vary; make the
   tolerance configurable per bill later) and description fuzzy-matches the bill title or a saved
   payee alias.
3. Confident matches auto-mark the bill paid (with `paidAt` = transaction date) and record which
   transaction triggered it; ambiguous matches surface as suggestions the user confirms.

Sync trigger: on page load with a short cooldown (free tiers; no cron needed), plus a manual
"Sync now" button.
