import { describe, expect, it } from 'vitest';
import { paidCents, remainingCents, sortBills, totalCents, unpaidCents } from './bills';

const bill = (
	title: string,
	opts: Partial<{
		paid: boolean;
		isAutoPay: boolean;
		dueDay: number | null;
		minPaymentCents: number | null;
	}> = {}
) => ({
	title,
	paid: opts.paid ?? false,
	isAutoPay: opts.isAutoPay ?? false,
	dueDay: opts.dueDay ?? null,
	minPaymentCents: opts.minPaymentCents ?? null
});

describe('sortBills', () => {
	it('orders unpaid manual, unpaid autopay, then paid', () => {
		const sorted = sortBills([
			bill('paid', { paid: true }),
			bill('auto', { isAutoPay: true }),
			bill('manual')
		]);
		expect(sorted.map((b) => b.title)).toEqual(['manual', 'auto', 'paid']);
	});

	it('orders by due day within a group, bills without a due day last', () => {
		const sorted = sortBills([
			bill('no-due'),
			bill('late', { dueDay: 25 }),
			bill('early', { dueDay: 3 })
		]);
		expect(sorted.map((b) => b.title)).toEqual(['early', 'late', 'no-due']);
	});

	it('falls back to title', () => {
		const sorted = sortBills([bill('b', { dueDay: 1 }), bill('a', { dueDay: 1 })]);
		expect(sorted.map((b) => b.title)).toEqual(['a', 'b']);
	});

	it('does not mutate the input', () => {
		const input = [bill('b'), bill('a')];
		sortBills(input);
		expect(input.map((b) => b.title)).toEqual(['b', 'a']);
	});
});

describe('totals', () => {
	const bills = [
		bill('rent', { minPaymentCents: 120000, paid: true }),
		bill('power', { minPaymentCents: 8000 }),
		bill('no-amount', { paid: true })
	];

	it('sums minimum payments', () => {
		expect(totalCents(bills)).toBe(128000);
		expect(paidCents(bills)).toBe(120000);
		expect(unpaidCents(bills)).toBe(8000);
	});

	it('computes remaining balance from paid bills', () => {
		expect(remainingCents(200000, bills)).toBe(80000);
		expect(remainingCents(0, bills)).toBe(-120000);
	});
});
