import { error, fail, redirect } from '@sveltejs/kit';
import { isMonth } from '$lib/domain/month';
import { parseBillForm } from '$lib/domain/validation';
import { listSyncedAccounts } from '$lib/server/banksync';
import * as bills from '$lib/server/bills';
import type { Actions, PageServerLoad } from './$types';

function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(302, '/');
	return { id: locals.dataUserId ?? locals.user.id };
}

function requireMonth(params: { month: string }) {
	if (!isMonth(params.month)) error(404, 'Not found');
	return params.month;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const month = requireMonth(params);
	return { month, syncedAccounts: await listSyncedAccounts(user.id) };
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		const { data, errors } = parseBillForm(await request.formData());
		if (!data) return fail(400, { intent: 'billForm', errors });
		await bills.createBill(user.id, month, data);
		redirect(303, `/bills/${month}`);
	}
};
