import { describe, expect, it } from 'vitest';
import {
	paidCents,
	remainingCents,
	sortBills,
	splitSections,
	totalCents,
	unpaidCents
} from './bills';

const bill = (
	title: string,
	opts: Partial<{
		paid: boolean;
		isAutoPay: boolean;
		dueDay: number | null;
		minPaymentCents: number | null;
		paidAt: string | null;
	}> = {}
) => ({
	title,
	paid: opts.paid ?? false,
	isAutoPay: opts.isAutoPay ?? false,
	dueDay: opts.dueDay ?? null,
	minPaymentCents: opts.minPaymentCents ?? null,
	paidAt: opts.paidAt ?? (opts.paid ? '2026-09-10T12:00:00.000Z' : null)
});

describe('sortBills', () => {
	it('sinks paid bills below unpaid regardless of mode', () => {
		const input = [bill('paid-early', { paid: true, dueDay: 1 }), bill('unpaid', { dueDay: 20 })];
		expect(sortBills(input, 'dueDate').map((b) => b.title)).toEqual(['unpaid', 'paid-early']);
		expect(sortBills(input, 'alpha').map((b) => b.title)).toEqual(['unpaid', 'paid-early']);
	});

	it('orders by due day, bills without a due day last', () => {
		const sorted = sortBills([
			bill('no-due'),
			bill('late', { dueDay: 25 }),
			bill('early', { dueDay: 3 })
		]);
		expect(sorted.map((b) => b.title)).toEqual(['early', 'late', 'no-due']);
	});

	it('breaks due-day ties by title', () => {
		const sorted = sortBills([bill('b', { dueDay: 1 }), bill('a', { dueDay: 1 })]);
		expect(sorted.map((b) => b.title)).toEqual(['a', 'b']);
	});

	it('sorts alphabetically ignoring due days in alpha mode', () => {
		const sorted = sortBills(
			[bill('zebra', { dueDay: 1 }), bill('apple', { dueDay: 28 })],
			'alpha'
		);
		expect(sorted.map((b) => b.title)).toEqual(['apple', 'zebra']);
	});

	it('does not mutate the input', () => {
		const input = [bill('b'), bill('a')];
		sortBills(input);
		expect(input.map((b) => b.title)).toEqual(['b', 'a']);
	});
});

describe('splitSections', () => {
	it('separates manual and autopay bills preserving order', () => {
		const { manual, autopay } = splitSections([
			bill('a', { isAutoPay: true }),
			bill('m1'),
			bill('m2')
		]);
		expect(manual.map((b) => b.title)).toEqual(['m1', 'm2']);
		expect(autopay.map((b) => b.title)).toEqual(['a']);
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

	it('deducts all paid bills when there is no balance snapshot time', () => {
		expect(remainingCents(200000, null, bills)).toBe(80000);
		expect(remainingCents(0, null, bills)).toBe(-120000);
	});

	it('only deducts bills paid after the balance snapshot', () => {
		const asOf = '2026-09-05T00:00:00.000Z';
		const mixed = [
			bill('cleared-before', {
				minPaymentCents: 50000,
				paid: true,
				paidAt: '2026-09-02T00:00:00.000Z'
			}),
			bill('marked-after', {
				minPaymentCents: 8000,
				paid: true,
				paidAt: '2026-09-10T00:00:00.000Z'
			}),
			bill('unpaid', { minPaymentCents: 3000 })
		];
		expect(remainingCents(100000, asOf, mixed)).toBe(92000);
	});
});
