import { describe, expect, it } from 'vitest';
import { currentMonth, formatMonth, isMonth, nextMonth, previousMonth } from './month';

describe('isMonth', () => {
	it('accepts YYYY-MM', () => {
		expect(isMonth('2026-08')).toBe(true);
		expect(isMonth('2026-01')).toBe(true);
		expect(isMonth('2026-12')).toBe(true);
	});

	it('rejects invalid values', () => {
		expect(isMonth('2026-13')).toBe(false);
		expect(isMonth('2026-00')).toBe(false);
		expect(isMonth('2026-8')).toBe(false);
		expect(isMonth('not-a-month')).toBe(false);
		expect(isMonth('2026-08-01')).toBe(false);
	});
});

describe('month arithmetic', () => {
	it('steps backward across a year boundary', () => {
		expect(previousMonth('2026-01')).toBe('2025-12');
		expect(previousMonth('2026-08')).toBe('2026-07');
	});

	it('steps forward across a year boundary', () => {
		expect(nextMonth('2026-12')).toBe('2027-01');
		expect(nextMonth('2026-08')).toBe('2026-09');
	});
});

describe('currentMonth', () => {
	it('uses local year and month', () => {
		expect(currentMonth(new Date(2026, 7, 31))).toBe('2026-08');
		expect(currentMonth(new Date(2026, 0, 1))).toBe('2026-01');
	});
});

describe('formatMonth', () => {
	it('renders a readable month', () => {
		expect(formatMonth('2026-08')).toBe('August 2026');
	});
});
