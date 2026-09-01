export type BillView = {
	id: number;
	title: string;
	dueDay: number | null;
	isAutoPay: boolean;
	minPaymentCents: number | null;
	payUrl: string | null;
	notifyDaysBefore: number | null;
	paid: boolean;
	paidAt: string | null;
};

// Unpaid manual bills first (most urgent), then unpaid autopay, then paid.
// Within a group: earliest due day first (no due day last), then title.
export function sortBills<T extends Pick<BillView, 'title' | 'isAutoPay' | 'dueDay' | 'paid'>>(
	bills: T[]
): T[] {
	const rank = (b: T) => (b.paid ? 2 : 0) + (b.isAutoPay ? 1 : 0);
	return [...bills].sort(
		(a, b) =>
			rank(a) - rank(b) || (a.dueDay ?? 32) - (b.dueDay ?? 32) || a.title.localeCompare(b.title)
	);
}

export function totalCents(bills: Pick<BillView, 'minPaymentCents'>[]): number {
	return bills.reduce((sum, b) => sum + (b.minPaymentCents ?? 0), 0);
}

export function paidCents(bills: Pick<BillView, 'minPaymentCents' | 'paid'>[]): number {
	return totalCents(bills.filter((b) => b.paid));
}

export function unpaidCents(bills: Pick<BillView, 'minPaymentCents' | 'paid'>[]): number {
	return totalCents(bills.filter((b) => !b.paid));
}

// Deducts bills paid after the balance snapshot; payments made before it are
// already reflected in the balance itself.
export function remainingCents(
	balanceCents: number,
	balanceAsOf: string | null,
	bills: Pick<BillView, 'minPaymentCents' | 'paid' | 'paidAt'>[]
): number {
	const deductible = bills.filter(
		(b) => b.paid && (!balanceAsOf || (b.paidAt !== null && b.paidAt > balanceAsOf))
	);
	return balanceCents - totalCents(deductible);
}
