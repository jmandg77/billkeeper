import { error, fail, redirect } from '@sveltejs/kit';
import { isMonth } from '$lib/domain/month';
import { parseMoney } from '$lib/domain/money';
import { parseBillForm } from '$lib/domain/validation';
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

	const [monthBills, months, budgetCents] = await Promise.all([
		bills.listMonth(user.id, month),
		bills.availableMonths(user.id),
		bills.getBudgetCents(user.id, month)
	]);

	return { month, bills: monthBills, months, budgetCents };
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
