import { env } from '$env/dynamic/private';
import { formatCents } from '$lib/domain/money';
import { reminderDueOn } from '$lib/domain/reminders';
import { ensureMonthSeeded } from './bills';
import { db } from './db';

type Reminder = {
	billId: number;
	title: string;
	amountCents: number | null;
	dueDate: string;
	month: string;
};

export type ReminderRunResult = {
	date: string;
	remindersFound: number;
	emailsSent: number;
	emailDisabled: boolean;
};

export async function getReminderEmails(userId: string): Promise<string[]> {
	const settings = await db.userSettings.findUnique({ where: { userId } });
	return settings?.reminderEmails ?? [];
}

export async function setReminderEmails(userId: string, emails: string[]): Promise<void> {
	await db.userSettings.upsert({
		where: { userId },
		update: { reminderEmails: emails },
		create: { userId, reminderEmails: emails }
	});
}

// Daily job: for every bill with a reminder window hitting today, email the
// user (once per bill per month, skipping bills already paid).
export async function sendDueReminders(now: Date = new Date()): Promise<ReminderRunResult> {
	const today = now.toISOString().slice(0, 10);
	const bills = await db.bill.findMany({
		where: { notifyDaysBefore: { not: null }, dueDay: { not: null } },
		select: {
			id: true,
			userId: true,
			title: true,
			minPaymentCents: true,
			dueDay: true,
			notifyDaysBefore: true,
			user: { select: { email: true } }
		}
	});

	const byUser = new Map<string, { email: string; reminders: Reminder[] }>();
	for (const bill of bills) {
		const due = reminderDueOn(today, bill.dueDay!, bill.notifyDaysBefore!);
		if (!due) continue;
		// The due month may not be materialized yet when the window crosses months.
		await ensureMonthSeeded(bill.userId, due.month);
		const payment = await db.payment.findUnique({
			where: { billId_month: { billId: bill.id, month: due.month } },
			select: { paid: true, notifiedAt: true }
		});
		if (!payment || payment.paid || payment.notifiedAt) continue;
		const entry = byUser.get(bill.userId) ?? { email: bill.user.email, reminders: [] };
		entry.reminders.push({
			billId: bill.id,
			title: bill.title,
			amountCents: bill.minPaymentCents,
			dueDate: due.dueDate,
			month: due.month
		});
		byUser.set(bill.userId, entry);
	}

	const remindersFound = [...byUser.values()].reduce((n, u) => n + u.reminders.length, 0);
	if (!env.RESEND_API_KEY) {
		return { date: today, remindersFound, emailsSent: 0, emailDisabled: true };
	}

	let emailsSent = 0;
	for (const [userId, { email, reminders }] of byUser) {
		const extra = await getReminderEmails(userId);
		const to = extra.length > 0 ? extra : [email];
		const delivered = await sendReminderEmail(to, reminders);
		if (!delivered) continue;
		emailsSent += 1;
		await db.payment.updateMany({
			where: { OR: reminders.map((r) => ({ billId: r.billId, month: r.month })) },
			data: { notifiedAt: now }
		});
	}
	return { date: today, remindersFound, emailsSent, emailDisabled: false };
}

async function sendReminderEmail(to: string[], reminders: Reminder[]): Promise<boolean> {
	const lines = reminders.map((r) => {
		const amount = r.amountCents !== null ? ` (${formatCents(r.amountCents)})` : '';
		return `${r.title}${amount} is due ${r.dueDate}`;
	});
	const subject =
		reminders.length === 1
			? `billkeeper: ${reminders[0].title} is due ${reminders[0].dueDate}`
			: `billkeeper: ${reminders.length} bills coming due`;
	const appUrl = env.ORIGIN || 'https://billkeeper-six.vercel.app';
	const text = `${lines.join('\n')}\n\n${appUrl}/bills/${reminders[0].month}`;

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${env.RESEND_API_KEY}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			from: env.EMAIL_FROM || 'billkeeper <onboarding@resend.dev>',
			to,
			subject,
			text
		})
	});
	if (!res.ok) console.error('reminder email failed', res.status, await res.text());
	return res.ok;
}
