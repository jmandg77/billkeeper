import { z } from 'zod';
import { parseMoney } from './money';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const billInputSchema = z.object({
	title: z.string().trim().min(1, 'Title is required').max(120, 'Title is too long'),
	dueDay: z.preprocess(
		emptyToUndefined,
		z.coerce.number().int().min(1, 'Day must be 1-31').max(31, 'Day must be 1-31').optional()
	),
	isAutoPay: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
	minPayment: z.preprocess(
		emptyToUndefined,
		z
			.string()
			.transform((v, ctx) => {
				const cents = parseMoney(v);
				if (cents === null) {
					ctx.addIssue({ code: 'custom', message: 'Enter an amount like 42.50' });
					return z.NEVER;
				}
				return cents;
			})
			.optional()
	),
	payUrl: z.preprocess(
		emptyToUndefined,
		z
			.url('Enter a full URL, like https://example.com')
			.regex(/^https?:\/\//, 'URL must start with http:// or https://')
			.max(2000)
			.optional()
	),
	notifyDaysBefore: z.preprocess(
		emptyToUndefined,
		z.coerce.number().int().min(0, 'Days must be 0-28').max(28, 'Days must be 0-28').optional()
	)
});

export type BillInput = z.infer<typeof billInputSchema>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One address per line or comma-separated; carrier text gateways are emails too.
export function parseReminderEmails(raw: string): { emails: string[] } | { error: string } {
	const emails = raw
		.split(/[\n,]/)
		.map((e) => e.trim())
		.filter(Boolean);
	if (emails.length > 5) return { error: 'At most 5 addresses' };
	const bad = emails.find((e) => !EMAIL_RE.test(e));
	if (bad) return { error: `"${bad}" doesn't look like an email address` };
	return { emails };
}

export function parseBillForm(form: FormData) {
	const result = billInputSchema.safeParse({
		title: form.get('title'),
		dueDay: form.get('dueDay'),
		isAutoPay: form.get('isAutoPay'),
		minPayment: form.get('minPayment'),
		payUrl: form.get('payUrl'),
		notifyDaysBefore: form.get('notifyDaysBefore')
	});
	if (result.success) return { data: result.data, errors: null };
	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = issue.path.join('.') || 'form';
		if (!(key in errors)) errors[key] = issue.message;
	}
	return { data: null, errors };
}
