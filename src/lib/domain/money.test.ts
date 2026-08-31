import { describe, expect, it } from 'vitest';
import { centsToInput, formatCents, parseMoney } from './money';

describe('parseMoney', () => {
	it('parses plain dollar amounts', () => {
		expect(parseMoney('42')).toBe(4200);
		expect(parseMoney('42.5')).toBe(4250);
		expect(parseMoney('42.55')).toBe(4255);
	});

	it('handles currency symbols and separators', () => {
		expect(parseMoney('$1,234.56')).toBe(123456);
		expect(parseMoney(' 10.00 ')).toBe(1000);
	});

	it('avoids float rounding errors', () => {
		expect(parseMoney('0.29')).toBe(29);
		expect(parseMoney('19.99')).toBe(1999);
	});

	it('rejects invalid input', () => {
		expect(parseMoney('')).toBeNull();
		expect(parseMoney('abc')).toBeNull();
		expect(parseMoney('12.345')).toBeNull();
		expect(parseMoney('-5')).toBeNull();
		expect(parseMoney('1e3')).toBeNull();
	});
});

describe('formatCents', () => {
	it('formats as USD', () => {
		expect(formatCents(123456)).toBe('$1,234.56');
		expect(formatCents(0)).toBe('$0.00');
		expect(formatCents(-500)).toBe('-$5.00');
	});
});

describe('centsToInput', () => {
	it('round-trips with parseMoney', () => {
		expect(centsToInput(4250)).toBe('42.50');
		expect(parseMoney(centsToInput(4250))).toBe(4250);
		expect(centsToInput(null)).toBe('');
	});
});
