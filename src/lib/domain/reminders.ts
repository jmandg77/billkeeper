import { currentMonth, nextMonth } from './month';

// A "YYYY-MM-DD" due date for a bill in a month, clamping short months
// (due day 31 in February becomes the 28th/29th).
export function dueDateInMonth(month: string, dueDay: number): string {
	const [year, m] = month.split('-').map(Number);
	const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
	return `${month}-${String(Math.min(dueDay, lastDay)).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

export type ReminderDue = { month: string; dueDate: string };

// If `today` is the day to remind for this bill (dueDay, N days ahead),
// returns the month the bill is due in; the due date may be in next month
// when the notice window crosses a month boundary.
export function reminderDueOn(
	today: string,
	dueDay: number,
	notifyDaysBefore: number
): ReminderDue | null {
	const thisMonth = currentMonth(new Date(`${today}T00:00:00Z`));
	for (const month of [thisMonth, nextMonth(thisMonth)]) {
		const dueDate = dueDateInMonth(month, dueDay);
		if (addDays(dueDate, -notifyDaysBefore) === today) return { month, dueDate };
	}
	return null;
}
