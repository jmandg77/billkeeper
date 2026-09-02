import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isMonth } from '$lib/domain/month';
import { parseMoney } from '$lib/domain/money';
import { getConnection } from '$lib/server/banksync';
import { resetBalanceFromBank, syncMonth } from '$lib/server/banksync/sync';
import * as bills from '$lib/server/bills';
import type { Actions, PageServerLoad } from './$types';

// Data access goes through the household's data user (the owner when this
// session was invited via an AccountShare).
function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(302, '/');
	return { id: locals.dataUserId ?? locals.user.id, email: locals.user.email };
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
	const [monthBills, months, budget, bank] = await Promise.all([
		bills.listMonth(user.id, month),
		bills.availableMonths(user.id),
		bills.getBudget(user.id, month),
		getConnection(user.id)
	]);

	return { month, bills: monthBills, months, budget, bank, isDemo };
};

export const actions: Actions = {
	setAmount: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		const form = await request.formData();
		const billId = Number(form.get('billId'));
		const amountCents = parseMoney(String(form.get('amount') ?? ''));
		if (!Number.isInteger(billId)) return invalidBill('setAmount');
		if (amountCents === null) {
			return fail(400, {
				intent: 'setAmount',
				billId,
				errors: { amount: 'Enter an amount like 42.50' } as FormErrors
			});
		}
		await bills.setBillAmount(user.id, billId, amountCents);
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
		const txnDate = String(form.get('txnDate') ?? '');
		if (!Number.isInteger(billId) || !txnId) return invalidBill('acceptMatch');
		await bills.acceptTxnMatch(user.id, billId, month, txnId, txnDate);
	},

	resetBalance: async ({ locals, params }) => {
		const user = requireUser(locals);
		const month = requireMonth(params);
		try {
			await resetBalanceFromBank(user.id, month);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Could not reset the balance';
			return fail(400, { intent: 'budget', errors: { balance: message } as FormErrors });
		}
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
