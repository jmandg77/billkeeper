import { matchTransactions } from '$lib/domain/matching';
import { db } from '../db';
import { fetchAccounts, toBankTxns } from './simplefin';

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
	const accounts = await fetchAccounts(connection.secret, { startDate });
	const txns = accounts.flatMap(toBankTxns);

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

	const syncedAt = new Date();
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
		syncedAt: syncedAt.toISOString()
	};
}
