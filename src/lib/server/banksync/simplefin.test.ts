import { describe, expect, it } from 'vitest';
import { amountToCents, decodeSetupToken, splitAccessUrl, toBankTxns } from './simplefin';

describe('decodeSetupToken', () => {
	it('decodes a base64 claim URL', () => {
		const token = Buffer.from('https://bridge.simplefin.org/simplefin/claim/demo').toString(
			'base64'
		);
		expect(decodeSetupToken(token)).toBe('https://bridge.simplefin.org/simplefin/claim/demo');
	});

	it('rejects garbage', () => {
		expect(() => decodeSetupToken('not-a-token')).toThrow('setup token');
	});
});

describe('splitAccessUrl', () => {
	it('moves embedded credentials into a basic auth header', () => {
		const { base, authorization } = splitAccessUrl(
			'https://demo:demo@bridge.simplefin.org/simplefin'
		);
		expect(base).toBe('https://bridge.simplefin.org/simplefin');
		expect(authorization).toBe('Basic ' + Buffer.from('demo:demo').toString('base64'));
	});
});

describe('amountToCents', () => {
	it('parses signed decimal strings without float drift', () => {
		expect(amountToCents('-123.45')).toBe(-12345);
		expect(amountToCents('-123.4')).toBe(-12340);
		expect(amountToCents('50')).toBe(5000);
		expect(amountToCents('0.29')).toBe(29);
	});

	it('rejects malformed amounts', () => {
		expect(amountToCents('12.345')).toBeNull();
		expect(amountToCents('abc')).toBeNull();
	});
});

describe('toBankTxns', () => {
	it('maps posted transactions and skips pending ones', () => {
		const txns = toBankTxns({
			id: 'acc1',
			name: 'Checking',
			balance: '100.00',
			transactions: [
				{
					id: 't1',
					posted: 1788220800,
					amount: '-94.00',
					description: 'PSE ELECTRIC',
					payee: 'PSE'
				},
				{ id: 't2', posted: 0, amount: '-10.00', description: 'PENDING THING', pending: true },
				{ id: 't3', posted: 1788220800, amount: 'garbage', description: 'BAD AMOUNT' }
			]
		});
		expect(txns).toEqual([
			{
				id: 't1',
				amountCents: -9400,
				date: '2026-09-01',
				description: 'PSE ELECTRIC',
				counterparty: 'PSE'
			}
		]);
	});
});
