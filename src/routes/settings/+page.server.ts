import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { parseReminderEmails } from '$lib/domain/validation';
import { getReminderEmails, setReminderEmails } from '$lib/server/notify';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/');
	if (locals.user.email === env.DEMO_EMAIL) redirect(302, '/bills');
	return {
		loginEmail: locals.user.email,
		reminderEmails: await getReminderEmails(locals.user.id)
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		if (!locals.user) redirect(302, '/');
		const form = await request.formData();
		const parsed = parseReminderEmails(String(form.get('reminderEmails') ?? ''));
		if ('error' in parsed) return fail(400, { error: parsed.error });
		await setReminderEmails(locals.user.id, parsed.emails);
		return { saved: true };
	}
};
