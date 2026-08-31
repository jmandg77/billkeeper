const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;

export function formatCents(cents: number): string {
	return (cents / 100).toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD'
	});
}

// Parses a dollar amount like "1,234.56" or "$40" into integer cents.
// Returns null when the input is not a valid amount.
export function parseMoney(input: string): number | null {
	const cleaned = input.trim().replace(/^\$/, '').replaceAll(',', '');
	if (!MONEY_RE.test(cleaned)) return null;
	const [dollars, fraction = ''] = cleaned.split('.');
	return Number(dollars) * 100 + Number(fraction.padEnd(2, '0') || '0');
}

export function centsToInput(cents: number | null): string {
	return cents === null ? '' : (cents / 100).toFixed(2);
}
