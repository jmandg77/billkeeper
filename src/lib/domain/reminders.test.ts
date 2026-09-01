import { describe, expect, it } from 'vitest';
import { addDays, dueDateInMonth, reminderDueOn } from './reminders';

describe('dueDateInMonth', () => {
	it('formats the due date', () => {
		expect(dueDateInMonth('2026-09', 15)).toBe('2026-09-15');
	});

	it('clamps to short months', () => {
		expect(dueDateInMonth('2026-02', 31)).toBe('2026-02-28');
		expect(dueDateInMonth('2028-02', 30)).toBe('2028-02-29');
		expect(dueDateInMonth('2026-04', 31)).toBe('2026-04-30');
	});
});

describe('addDays', () => {
	it('crosses month and year boundaries', () => {
		expect(addDays('2026-09-01', -3)).toBe('2026-08-29');
		expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
	});
});

describe('reminderDueOn', () => {
	it('matches N days before the due day', () => {
		expect(reminderDueOn('2026-09-12', 15, 3)).toEqual({ month: '2026-09', dueDate: '2026-09-15' });
	});

	it('returns null on other days', () => {
		expect(reminderDueOn('2026-09-11', 15, 3)).toBeNull();
		expect(reminderDueOn('2026-09-15', 15, 3)).toBeNull();
	});

	it('supports day-of reminders', () => {
		expect(reminderDueOn('2026-09-15', 15, 0)).toEqual({ month: '2026-09', dueDate: '2026-09-15' });
	});

	it('crosses into next month when the notice window does', () => {
		expect(reminderDueOn('2026-09-29', 1, 2)).toEqual({ month: '2026-10', dueDate: '2026-10-01' });
	});

	it('handles clamped due days', () => {
		expect(reminderDueOn('2026-02-26', 31, 2)).toEqual({ month: '2026-02', dueDate: '2026-02-28' });
	});
});
