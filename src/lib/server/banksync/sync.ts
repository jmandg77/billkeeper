import { matchTransactions } from '$lib/domain/matching';
import { setBudgetCents } from '../bills';
import { db } from '../db';
import { amountToCents, fetchAccounts, toBankTxns } from './simplefin';

export type SyncMatch = {
	billId: number;
	title: string;
	txnId: string;
	description: string;
	amountCents: number;
	date: string;
};

export type SyncOutcome = {
	autoMarked: SyncMatch[];
	suggested: SyncMatch[];
	// present when a single account is selected and its balance was applied
	balanceCents: number | null;
	accountsRefreshed: number;
	syncedAt: string;
};

// Fetches this month's bank transactions and pairs them with unpaid bills.
// Confident matches are marked paid immediately; amount-only matches are
// returned for the user to confirm.
export async function syncMonth(userId: string, month: string): Promise<SyncOutcome> {
	const connection = await db.bankConnection.findUnique({
		where: { userId_provider: { userId, provider: 'simplefin' } }
	});
	if (!connection?.secret) throw new Error('No bank connection');

	const [year, m] = month.split('-').map(Number);
	const startDate = Math.floor(Date.UTC(year, m - 1, 1) / 1000);
	// All accounts, for balances; transactions still match only against the
	// selected account when one is set.
	const accounts = await fetchAccounts(connection.secret, { startDate });
	const txns = accounts
		.filter((a) => !connection.accountId || a.id === connection.accountId)
		.flatMap(toBankTxns);

	const syncedAt = new Date();
	const balances = new Map<string, number>();
	for (const account of accounts) {
		const cents = amountToCents(account.balance);
		if (cents === null) continue;
		balances.set(account.id, cents);
		const orgName = account.org?.name ?? account.org?.domain ?? null;
		await db.bankAccount.upsert({
			where: { userId_accountId: { userId, accountId: account.id } },
			update: { name: account.name, orgName, balanceCents: cents, syncedAt },
			create: {
				userId,
				accountId: account.id,
				name: account.name,
				orgName,
				balanceCents: cents,
				syncedAt
			}
		});
	}

	// Linked bills take their amount from the account balance — unpaid ones
	// only (a card paid off this month keeps the amount it was paid at), and
	// not ones whose amount the user set by hand this month.
	const linkedBills = await db.bill.findMany({
		where: {
			userId,
			linkedAccountId: { not: null },
			payments: { some: { month, paid: false, amountOverriddenAt: null } }
		},
		select: { id: true, linkedAccountId: true }
	});
	for (const bill of linkedBills) {
		const cents = balances.get(bill.linkedAccountId!);
		if (cents === undefined) continue;
		await db.bill.update({
			where: { id: bill.id },
			data: { minPaymentCents: Math.abs(cents) }
		});
	}

	const unpaidBills = await db.bill.findMany({
		where: {
			userId,
			minPaymentCents: { not: null },
			payments: { some: { month, paid: false } }
		},
		select: { id: true, title: true, minPaymentCents: true }
	});

	const { confident, suggested } = matchTransactions(unpaidBills, txns);
	const titles = new Map(unpaidBills.map((b) => [b.id, b.title]));

	for (const match of confident) {
		await db.payment.update({
			where: { billId_month: { billId: match.billId, month } },
			data: {
				paid: true,
				paidAt: new Date(`${match.txn.date}T00:00:00Z`),
				matchedTxnId: match.txn.id
			}
		});
	}

	// With one account selected, its live balance becomes the month's balance;
	// paid-before-now bills won't deduct from it (see remainingCents).
	let balanceCents: number | null = null;
	if (connection.accountId) {
		balanceCents = balances.get(connection.accountId) ?? null;
		if (balanceCents !== null) await setBudgetCents(userId, month, balanceCents);
	}

	await db.bankConnection.update({
		where: { id: connection.id },
		data: { lastSyncedAt: syncedAt }
	});

	const describe = (match: { billId: number; txn: (typeof txns)[number] }): SyncMatch => ({
		billId: match.billId,
		title: titles.get(match.billId) ?? 'Unknown bill',
		txnId: match.txn.id,
		description: match.txn.counterparty ?? match.txn.description,
		amountCents: match.txn.amountCents,
		date: match.txn.date
	});

	return {
		autoMarked: confident.map(describe),
		suggested: suggested.map(describe),
		balanceCents,
		accountsRefreshed: balances.size,
		syncedAt: syncedAt.toISOString()
	};
}

// Re-pulls the selected account's current balance into the month's budget.
export async function resetBalanceFromBank(userId: string, month: string): Promise<number> {
	const connection = await db.bankConnection.findUnique({
		where: { userId_provider: { userId, provider: 'simplefin' } }
	});
	if (!connection?.secret) throw new Error('No bank connection');
	if (!connection.accountId) {
		throw new Error('Pick a single account first (the "change" link on the bank card)');
	}
	const accounts = await fetchAccounts(connection.secret, {
		balancesOnly: true,
		accountId: connection.accountId
	});
	const balanceCents = accounts[0] ? amountToCents(accounts[0].balance) : null;
	if (balanceCents === null) throw new Error('Could not read the account balance');
	await setBudgetCents(userId, month, balanceCents);
	return balanceCents;
}
