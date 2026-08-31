const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
	return MONTH_RE.test(value);
}

export function currentMonth(now: Date = new Date()): string {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function previousMonth(month: string): string {
	const [year, m] = month.split('-').map(Number);
	return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, '0')}`;
}

export function nextMonth(month: string): string {
	const [year, m] = month.split('-').map(Number);
	return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string): string {
	const [year, m] = month.split('-').map(Number);
	return new Date(year, m - 1).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long'
	});
}
