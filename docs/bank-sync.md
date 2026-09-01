# Bank sync

Connect a checking account read-only, pull its transactions, and match them against the month's
unpaid bills — so bills get marked paid without clicking anything.

Explicitly out of scope: initiating payments. Payment-initiation APIs require business
partnerships; billkeeper only ever reads transactions.

## Provider: SimpleFIN Bridge

The shipped provider is [SimpleFIN Bridge](https://beta-bridge.simplefin.org) ($1.50/mo, paid by
the user; the same sync path Actual Budget uses). The user connects their bank on the bridge
(credentials go to MX, the underlying aggregator — never to SimpleFIN or billkeeper), creates an
app connection there, and pastes the one-time **setup token** into billkeeper's Bank sync card.

Flow (`src/lib/server/banksync/`):

1. `simplefin.ts` — decode the base64 setup token to a claim URL, POST it once, store the
   returned access URL per user in `BankConnection.secret`. The access URL embeds basic-auth
   credentials; they're split into an `Authorization` header because `fetch()` rejects URLs with
   credentials.
2. `sync.ts` — on "Sync now", fetch posted transactions since the first of the viewed month and
   run the matcher.
3. `src/lib/domain/matching.ts` (pure, tested) — outgoing transactions only, amount within ±$1 of
   the bill's amount; if the bill title also matches the description/payee tokens the bill is
   **auto-marked paid** (with `Payment.matchedTxnId` for provenance), otherwise it's returned as a
   **suggestion** the user confirms with one click. Each transaction pairs with at most one bill.

Teller (free ≤100 connections, mTLS) fits the same seam as a sibling provider — as of Sep 2026
their signup is not self-serve, so it's parked.

## Testing without a real bank

SimpleFIN's public demo access URL `https://demo:demo@beta-bridge.simplefin.org/simplefin` can be
inserted directly as a `BankConnection.secret` to exercise the full sync path against demo
accounts/transactions.
