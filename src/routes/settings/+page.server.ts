import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { currentMonth } from '$lib/domain/month';
import { parseReminderEmails } from '$lib/domain/validation';
import {
	connectSimplefin,
	disconnectBank,
	getConnection,
	listBankAccounts,
	listSyncedAccounts,
	setBankAccount
} from '$lib/server/banksync';
import { syncMonth } from '$lib/server/banksync/sync';
import { db } from '$lib/server/db';
import { getReminderEmails, setReminderEmails } from '$lib/server/notify';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(302, '/');
	return locals.user;
}

// Bank and reminder data belong to the household's data user.
function dataUserId(locals: App.Locals) {
	return locals.dataUserId ?? requireUser(locals).id;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	if (user.email === env.DEMO_EMAIL) redirect(302, '/bills');
	const shares = locals.sharedBy
		? []
		: await db.accountShare.findMany({ where: { ownerId: user.id }, orderBy: { email: 'asc' } });
	return {
		loginEmail: user.email,
		sharedBy: locals.sharedBy,
		bank: await getConnection(dataUserId(locals)),
		reminderEmails: await getReminderEmails(dataUserId(locals)),
		shares: shares.map((s) => ({ id: s.id, email: s.email })),
		syncedAccounts: await listSyncedAccounts(dataUserId(locals))
	};
};

export const actions: Actions = {
	connectBank: async ({ locals, request }) => {
		requireUser(locals);
		const form = await request.formData();
		const setupToken = String(form.get('setupToken') ?? '').trim();
		if (!setupToken) {
			return fail(400, { intent: 'connectBank', error: 'Paste a setup token' });
		}
		try {
			await connectSimplefin(dataUserId(locals), setupToken);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Could not connect';
			return fail(400, { intent: 'connectBank', error: message });
		}
	},

	disconnectBank: async ({ locals }) => {
		requireUser(locals);
		await disconnectBank(dataUserId(locals));
	},

	listBankAccounts: async ({ locals }) => {
		requireUser(locals);
		try {
			return { intent: 'listBankAccounts', accounts: await listBankAccounts(dataUserId(locals)) };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Could not load accounts';
			return fail(400, { intent: 'listBankAccounts', error: message });
		}
	},

	setBankAccount: async ({ locals, request }) => {
		requireUser(locals);
		const form = await request.formData();
		const accountId = String(form.get('accountId') ?? '');
		const accountName = String(form.get('accountName') ?? '');
		await setBankAccount(
			dataUserId(locals),
			accountId ? { id: accountId, name: accountName } : null
		);
	},

	syncBank: async ({ locals }) => {
		requireUser(locals);
		try {
			return { intent: 'syncBank', sync: await syncMonth(dataUserId(locals), currentMonth()) };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Sync failed';
			return fail(400, { intent: 'syncBank', error: message });
		}
	},

	save: async ({ locals, request }) => {
		requireUser(locals);
		const form = await request.formData();
		const parsed = parseReminderEmails(String(form.get('reminderEmails') ?? ''));
		if ('error' in parsed) return fail(400, { intent: 'save', error: parsed.error });
		await setReminderEmails(dataUserId(locals), parsed.emails);
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
