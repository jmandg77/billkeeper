import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { parseReminderEmails } from '$lib/domain/validation';
import { db } from '$lib/server/db';
import { getReminderEmails, setReminderEmails } from '$lib/server/notify';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(302, '/');
	return locals.user;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	if (user.email === env.DEMO_EMAIL) redirect(302, '/bills');
	const dataUserId = locals.dataUserId ?? user.id;
	const shares = locals.sharedBy
		? []
		: await db.accountShare.findMany({ where: { ownerId: user.id }, orderBy: { email: 'asc' } });
	return {
		loginEmail: user.email,
		sharedBy: locals.sharedBy,
		reminderEmails: await getReminderEmails(dataUserId),
		shares: shares.map((s) => ({ id: s.id, email: s.email }))
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const parsed = parseReminderEmails(String(form.get('reminderEmails') ?? ''));
		if ('error' in parsed) return fail(400, { intent: 'save', error: parsed.error });
		await setReminderEmails(locals.dataUserId ?? user.id, parsed.emails);
		return { intent: 'save', saved: true };
	},

	addShare: async ({ locals, request }) => {
		const user = requireUser(locals);
		if (locals.sharedBy) return fail(403, { intent: 'share', error: 'Only the owner can share' });
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		if (!EMAIL_RE.test(email)) {
			return fail(400, { intent: 'share', error: 'Enter a valid email address' });
		}
		if (email === user.email.toLowerCase()) {
			return fail(400, { intent: 'share', error: 'That is your own email' });
		}
		try {
			await db.accountShare.create({ data: { ownerId: user.id, email } });
		} catch {
			return fail(400, { intent: 'share', error: 'That email already has access somewhere' });
		}
	},

	removeShare: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const id = Number(form.get('shareId'));
		if (!Number.isInteger(id)) return fail(400, { intent: 'share', error: 'Invalid share' });
		await db.accountShare.deleteMany({ where: { id, ownerId: user.id } });
	}
};
