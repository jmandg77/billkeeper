import { describe, expect, it } from 'vitest';
import { matchTransactions, type BankTxn, type MatchableBill } from './matching';

const bill = (id: number, title: string, cents: number | null): MatchableBill => ({
	id,
	title,
	minPaymentCents: cents
});

const txn = (
	id: string,
	amountCents: number,
	description: string,
	counterparty?: string
): BankTxn => ({
	id,
	amountCents,
	date: '2026-09-12',
	description,
	counterparty: counterparty ?? null
});

describe('matchTransactions', () => {
	it('is confident when amount and payee both match', () => {
		const result = matchTransactions(
			[bill(1, 'Electric', 9400)],
			[txn('t1', -9400, 'PUGET SOUND ELECTRIC BILLPAY')]
		);
		expect(result.confident).toEqual([{ billId: 1, txn: expect.objectContaining({ id: 't1' }) }]);
		expect(result.suggested).toEqual([]);
	});

	it('matches on counterparty name too', () => {
		const result = matchTransactions(
			[bill(1, 'Internet', 7999)],
			[txn('t1', -7999, 'ACH WITHDRAWAL 00291', 'Comcast Internet')]
		);
		expect(result.confident).toHaveLength(1);
	});

	it('suggests when only the amount matches', () => {
		const result = matchTransactions(
			[bill(1, 'Rent', 185000)],
			[txn('t1', -185000, 'ZELLE PMT 4412')]
		);
		expect(result.confident).toEqual([]);
		expect(result.suggested).toHaveLength(1);
	});

	it('tolerates one dollar of drift', () => {
		const result = matchTransactions(
			[bill(1, 'Water', 6200)],
			[txn('t1', -6280, 'CITY WATER UTIL')]
		);
		expect(result.confident).toHaveLength(1);
	});

	it('rejects beyond the tolerance, deposits, and bills without amounts', () => {
		const result = matchTransactions(
			[bill(1, 'Water', 6200), bill(2, 'Unknown', null)],
			[txn('t1', -6400, 'CITY WATER UTIL'), txn('t2', 6200, 'REFUND WATER UTIL')]
		);
		expect(result.confident).toEqual([]);
		expect(result.suggested).toEqual([]);
	});

	it('uses each transaction at most once, preferring payee matches', () => {
		const result = matchTransactions(
			[bill(1, 'Streaming', 1599), bill(2, 'Netflix', 1599)],
			[txn('t1', -1599, 'NETFLIX.COM')]
		);
		expect(result.confident).toEqual([{ billId: 2, txn: expect.objectContaining({ id: 't1' }) }]);
		expect(result.suggested).toEqual([]);
	});

	it('pairs multiple bills with multiple transactions', () => {
		const result = matchTransactions(
			[bill(1, 'Electric', 9400), bill(2, 'Car Insurance', 14250)],
			[txn('t1', -14250, 'GEICO AUTO INSURANCE'), txn('t2', -9400, 'PSE ELECTRIC')]
		);
		expect(result.confident).toHaveLength(2);
	});

	it('ignores short noise tokens when matching payees', () => {
		const result = matchTransactions([bill(1, 'Gym', 2500)], [txn('t1', -2500, 'LA FITNESS 0042')]);
		expect(result.suggested).toHaveLength(1);
	});
});
