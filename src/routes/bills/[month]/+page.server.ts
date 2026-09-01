import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isMonth } from '$lib/domain/month';
import { parseMoney } from '$lib/domain/money';
import { parseBillForm } from '$lib/domain/validation';
import { connectSimplefin, disconnectBank, getConnection } from '$lib/server/banksync';
import { syncMonth } from '$lib/server/banksync/sync';
import * as bills from '$lib/server/bills';
import type { Actions, PageServerLoad } from './$types';

function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(302, '/');
	return locals.user;
}

function requireMonth(params: { month: string }) {
	if (!isMonth(params.month)) error(404, 'Not found');
	return params.month;
}

type FormErrors = Record<string, string>;

const invalidBill = (intent: string) =>
	fail(400, { intent, errors: { form: 'Invalid bill' } as FormErrors });

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const month = requireMonth(params);

	const isDemo = user.email === env.DEMO_EMAIL;
	const [monthBills, months, budgetCents, bank] = await Promise.all([
		bills.listMonth(user.id, month),
		bills.availableMonths(user.id),
		bills.getBudgetCents(user.id, month),
		isDemo ? null : getConnection(user.id)
	]);

	return { month, bills: monthBills, months, budgetCents, bank, isDemo };
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		const { data, errors } = parseBillForm(await request.formData());
		if (!data) return fail(400, { intent: 'create', errors });
		await bills.createBill(user.id, month, data);
	},

	update: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		requireMonth(params);
		const form = await request.formData();
		const billId = Number(form.get('billId'));
		if (!Number.isInteger(billId)) return invalidBill('update');
		const { data, errors } = parseBillForm(form);
		if (!data) return fail(400, { intent: 'update', errors });
		await bills.updateBill(user.id, billId, data);
	},

	delete: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const billId = Number(form.get('billId'));
		if (!Number.isInteger(billId)) return invalidBill('delete');
		await bills.deleteBill(user.id, billId);
	},

	setPaid: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		const form = await request.formData();
		const billId = Number(form.get('billId'));
		const paid = form.get('paid') === 'true';
		if (!Number.isInteger(billId)) return invalidBill('setPaid');
		await bills.setPaid(user.id, billId, month, paid);
	},

	connectBank: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const setupToken = String(form.get('setupToken') ?? '').trim();
		if (!setupToken) {
			return fail(400, {
				intent: 'connectBank',
				errors: { setupToken: 'Paste a setup token' } as FormErrors
			});
		}
		try {
			await connectSimplefin(user.id, setupToken);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Could not connect';
			return fail(400, { intent: 'connectBank', errors: { setupToken: message } as FormErrors });
		}
	},

	disconnectBank: async ({ locals }) => {
		const user = requireUser(locals);
		await disconnectBank(user.id);
	},

	syncBank: async ({ locals, params }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		try {
			const sync = await syncMonth(user.id, month);
			return { intent: 'syncBank', sync };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Sync failed';
			return fail(400, { intent: 'syncBank', errors: { sync: message } as FormErrors });
		}
	},

	acceptMatch: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		const form = await request.formData();
		const billId = Number(form.get('billId'));
		const txnId = String(form.get('txnId') ?? '');
		if (!Number.isInteger(billId) || !txnId) return invalidBill('acceptMatch');
		await bills.acceptTxnMatch(user.id, billId, month, txnId);
	},

	budget: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		const form = await request.formData();
		const balanceCents = parseMoney(String(form.get('balance') ?? ''));
		if (balanceCents === null) {
			return fail(400, {
				intent: 'budget',
				errors: { balance: 'Enter an amount like 2500.00' } as FormErrors
			});
		}
		await bills.setBudgetCents(user.id, month, balanceCents);
	}
};
