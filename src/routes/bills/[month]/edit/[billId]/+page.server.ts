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

function requireParams(params: { month: string; billId: string }) {
	const billId = Number(params.billId);
	if (!isMonth(params.month) || !Number.isInteger(billId)) error(404, 'Not found');
	return { month: params.month, billId };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const { month, billId } = requireParams(params);
	const bill = (await bills.listMonth(user.id, month)).find((b) => b.id === billId);
	if (!bill) error(404, 'Not found');
	return { month, bill, syncedAccounts: await listSyncedAccounts(user.id) };
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const { month, billId } = requireParams(params);
		const { data, errors } = parseBillForm(await request.formData());
		if (!data) return fail(400, { errors });
		await bills.updateBill(user.id, billId, data);
		redirect(303, `/bills/${month}`);
	}
};
