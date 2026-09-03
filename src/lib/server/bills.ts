import type { BillInput } from '$lib/domain/validation';
import type { BillView } from '$lib/domain/bills';
import { currentMonth, previousMonth } from '$lib/domain/month';
import { db } from './db';

// A bill belongs to a month when it has a Payment row for that month.
// The current month materializes lazily with every bill unpaid — a bill
// stays in play until deleted. Past months are history and never change.

export async function listMonth(userId: string, month: string): Promise<BillView[]> {
	await ensureMonthSeeded(userId, month);
	const [bills, accounts] = await Promise.all([
		db.bill.findMany({
			where: { userId, payments: { some: { month } } },
			include: { payments: { where: { month } } }
		}),
		db.bankAccount.findMany({ where: { userId }, select: { accountId: true, balanceCents: true } })
	]);
	const balances = new Map(accounts.map((a) => [a.accountId, a.balanceCents]));
	return bills.map((bill) => {
		const payment = bill.payments[0];
		return {
			id: bill.id,
			title: bill.title,
			dueDay: bill.dueDay,
			isAutoPay: bill.isAutoPay,
			minPaymentCents: bill.minPaymentCents,
			payUrl: bill.payUrl,
			notifyDaysBefore: bill.notifyDaysBefore,
			linkedAccountId: bill.linkedAccountId,
			linkedBalanceCents:
				bill.linkedAccountId !== null ? (balances.get(bill.linkedAccountId) ?? null) : null,
			paid: payment?.paid ?? false,
			paidAt: payment?.paidAt?.toISOString() ?? null
		};
	});
}

export async function ensureMonthSeeded(userId: string, month: string): Promise<void> {
	// Current month, or next month so reminder windows can cross the boundary.
	if (month !== currentMonth() && previousMonth(month) !== currentMonth()) return;
	const existing = await db.payment.count({ where: { month, bill: { userId } } });
	if (existing > 0) return;

	const bills = await db.bill.findMany({ where: { userId }, select: { id: true } });
	if (bills.length === 0) return;

	await db.payment.createMany({
		data: bills.map((bill) => ({ billId: bill.id, month })),
		skipDuplicates: true
	});
}

export async function availableMonths(userId: string): Promise<string[]> {
	const rows = await db.payment.findMany({
		where: { bill: { userId } },
		distinct: ['month'],
		select: { month: true }
	});
	const months = new Set(rows.map((r) => r.month));
	months.add(currentMonth());
	return [...months].sort((a, b) => b.localeCompare(a));
}

// A linked account must be one the user's sync has actually seen.
async function resolveLinkedAccount(userId: string, accountId?: string): Promise<string | null> {
	if (!accountId) return null;
	const account = await db.bankAccount.findUnique({
		where: { userId_accountId: { userId, accountId } }
	});
	return account ? account.accountId : null;
}

export async function createBill(userId: string, month: string, input: BillInput): Promise<void> {
	await db.bill.create({
		data: {
			userId,
			title: input.title,
			dueDay: input.dueDay ?? null,
			isAutoPay: input.isAutoPay,
			minPaymentCents: input.minPayment ?? null,
			payUrl: input.payUrl ?? null,
			notifyDaysBefore: input.notifyDaysBefore ?? null,
			linkedAccountId: await resolveLinkedAccount(userId, input.linkedAccountId),
			payments: { create: { month } }
		}
	});
}

export async function updateBill(userId: string, billId: number, input: BillInput): Promise<void> {
	await db.bill.update({
		where: { id: billId, userId },
		data: {
			title: input.title,
			dueDay: input.dueDay ?? null,
			isAutoPay: input.isAutoPay,
			minPaymentCents: input.minPayment ?? null,
			payUrl: input.payUrl ?? null,
			notifyDaysBefore: input.notifyDaysBefore ?? null,
			linkedAccountId: await resolveLinkedAccount(userId, input.linkedAccountId)
		}
	});
}

export async function setBillAmount(
	userId: string,
	billId: number,
	amountCents: number
): Promise<void> {
	await db.bill.update({
		where: { id: billId, userId },
		data: { minPaymentCents: amountCents }
	});
}

export async function deleteBill(userId: string, billId: number): Promise<void> {
	await db.bill.delete({ where: { id: billId, userId } });
}

export async function setPaid(
	userId: string,
	billId: number,
	month: string,
	paid: boolean
): Promise<void> {
	const bill = await db.bill.findUnique({ where: { id: billId, userId }, select: { id: true } });
	if (!bill) throw new Error('Bill not found');
	await db.payment.upsert({
		where: { billId_month: { billId, month } },
		update: { paid, paidAt: paid ? new Date() : null, matchedTxnId: paid ? undefined : null },
		create: { billId, month, paid, paidAt: paid ? new Date() : null }
	});
}

export async function acceptTxnMatch(
	userId: string,
	billId: number,
	month: string,
	txnId: string,
	txnDate: string
): Promise<void> {
	const bill = await db.bill.findUnique({ where: { id: billId, userId }, select: { id: true } });
	if (!bill) throw new Error('Bill not found');
	// The transaction already cleared, so date it then — a balance snapshot
	// taken since already reflects this money leaving.
	const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(txnDate)
		? new Date(`${txnDate}T00:00:00Z`)
		: new Date();
	await db.payment.update({
		where: { billId_month: { billId, month } },
		data: { paid: true, paidAt, matchedTxnId: txnId }
	});
}

export type Budget = { balanceCents: number; balanceAsOf: string | null };

export async function getBudget(userId: string, month: string): Promise<Budget> {
	const budget = await db.monthBudget.findUnique({
		where: { userId_month: { userId, month } }
	});
	return {
		balanceCents: budget?.balanceCents ?? 0,
		balanceAsOf: budget?.balanceAsOf?.toISOString() ?? null
	};
}

export async function setBudgetCents(
	userId: string,
	month: string,
	balanceCents: number
): Promise<void> {
	const balanceAsOf = new Date();
	await db.monthBudget.upsert({
		where: { userId_month: { userId, month } },
		update: { balanceCents, balanceAsOf },
		create: { userId, month, balanceCents, balanceAsOf }
	});
}
