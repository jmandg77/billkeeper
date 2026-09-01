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

export type SortMode = 'dueDate' | 'alpha';

// Paid bills sink to the bottom; above that, the chosen order — due day
// (bills without one last) or title.
export function sortBills<T extends Pick<BillView, 'title' | 'dueDay' | 'paid'>>(
	bills: T[],
	mode: SortMode = 'dueDate'
): T[] {
	return [...bills].sort(
		(a, b) =>
			Number(a.paid) - Number(b.paid) ||
			(mode === 'dueDate' ? (a.dueDay ?? 32) - (b.dueDay ?? 32) : 0) ||
			a.title.localeCompare(b.title)
	);
}

// Bills the user pays by hand come first; autopay watches itself.
export function splitSections<T extends Pick<BillView, 'isAutoPay'>>(
	bills: T[]
): { manual: T[]; autopay: T[] } {
	return {
		manual: bills.filter((b) => !b.isAutoPay),
		autopay: bills.filter((b) => b.isAutoPay)
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
