export type BillView = {
	id: number;
	title: string;
	dueDay: number | null;
	isAutoPay: boolean;
	minPaymentCents: number | null;
	payUrl: string | null;
	notifyDaysBefore: number | null;
	linkedAccountId: string | null;
	linkedBalanceCents: number | null;
	paid: boolean;
	paidAt: string | null;
};

export type SortMode = 'dueDate' | 'alpha';

// The chosen order: due day (bills without one last) or title.
export function sortBills<T extends Pick<BillView, 'title' | 'dueDay'>>(
	bills: T[],
	mode: SortMode = 'dueDate'
): T[] {
	return [...bills].sort(
		(a, b) =>
			(mode === 'dueDate' ? (a.dueDay ?? 32) - (b.dueDay ?? 32) : 0) ||
			a.title.localeCompare(b.title)
	);
}

// Unpaid bills split by who does the paying; everything already paid lands
// together at the bottom.
export function splitSections<T extends Pick<BillView, 'isAutoPay' | 'paid'>>(
	bills: T[]
): { toPay: T[]; autopay: T[]; paid: T[] } {
	return {
		toPay: bills.filter((b) => !b.paid && !b.isAutoPay),
		autopay: bills.filter((b) => !b.paid && b.isAutoPay),
		paid: bills.filter((b) => b.paid)
	};
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
