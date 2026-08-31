import type { BillInput } from '$lib/domain/validation';
import type { BillView } from '$lib/domain/bills';
import { currentMonth, previousMonth } from '$lib/domain/month';
import { db } from './db';

// A bill belongs to a month when it has a Payment row for that month.
// Months are materialized lazily: viewing an empty month copies the bills
// that existed in the previous month as unpaid payments.

export async function listMonth(userId: string, month: string): Promise<BillView[]> {
	await ensureMonthSeeded(userId, month);
	const bills = await db.bill.findMany({
		where: { userId, payments: { some: { month } } },
		include: { payments: { where: { month } } }
	});
	return bills.map((bill) => {
		const payment = bill.payments[0];
		return {
			id: bill.id,
			title: bill.title,
			dueDay: bill.dueDay,
			isAutoPay: bill.isAutoPay,
			minPaymentCents: bill.minPaymentCents,
			payUrl: bill.payUrl,
			paid: payment?.paid ?? false,
			paidAt: payment?.paidAt?.toISOString() ?? null
		};
	});
}

async function ensureMonthSeeded(userId: string, month: string): Promise<void> {
	if (month > currentMonth()) return; // don't materialize future months on view
	const existing = await db.payment.count({ where: { month, bill: { userId } } });
	if (existing > 0) return;

	const previousBills = await db.bill.findMany({
		where: { userId, payments: { some: { month: previousMonth(month) } } },
		select: { id: true }
	});
	if (previousBills.length === 0) return;

	await db.payment.createMany({
		data: previousBills.map((bill) => ({ billId: bill.id, month })),
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

export async function createBill(userId: string, month: string, input: BillInput): Promise<void> {
	await db.bill.create({
		data: {
			userId,
			title: input.title,
			dueDay: input.dueDay ?? null,
			isAutoPay: input.isAutoPay,
			minPaymentCents: input.minPayment ?? null,
			payUrl: input.payUrl ?? null,
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
			payUrl: input.payUrl ?? null
		}
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
		update: { paid, paidAt: paid ? new Date() : null },
		create: { billId, month, paid, paidAt: paid ? new Date() : null }
	});
}

export async function getBudgetCents(userId: string, month: string): Promise<number> {
	const budget = await db.monthBudget.findUnique({
		where: { userId_month: { userId, month } }
	});
	return budget?.balanceCents ?? 0;
}

export async function setBudgetCents(
	userId: string,
	month: string,
	balanceCents: number
): Promise<void> {
	await db.monthBudget.upsert({
		where: { userId_month: { userId, month } },
		update: { balanceCents },
		create: { userId, month, balanceCents }
	});
}
