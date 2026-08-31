import { describe, expect, it } from 'vitest';
import { parseBillForm } from './validation';

const form = (fields: Record<string, string>) => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
};

describe('parseBillForm', () => {
	it('parses a full bill', () => {
		const { data, errors } = parseBillForm(
			form({
				title: 'Electric',
				dueDay: '15',
				isAutoPay: 'on',
				minPayment: '84.20',
				payUrl: 'https://example.com/pay'
			})
		);
		expect(errors).toBeNull();
		expect(data).toEqual({
			title: 'Electric',
			dueDay: 15,
			isAutoPay: true,
			minPayment: 8420,
			payUrl: 'https://example.com/pay'
		});
	});

	it('treats empty optional fields as absent', () => {
		const { data, errors } = parseBillForm(
			form({ title: 'Rent', dueDay: '', minPayment: '', payUrl: '' })
		);
		expect(errors).toBeNull();
		expect(data).toEqual({ title: 'Rent', isAutoPay: false });
	});

	it('requires a title', () => {
		const { errors } = parseBillForm(form({ title: '  ' }));
		expect(errors?.title).toBe('Title is required');
	});

	it('rejects a javascript: pay URL', () => {
		const { errors } = parseBillForm(form({ title: 'x', payUrl: 'javascript:alert(1)' }));
		expect(errors?.payUrl).toBeTruthy();
	});

	it('rejects an out-of-range due day', () => {
		const { errors } = parseBillForm(form({ title: 'x', dueDay: '32' }));
		expect(errors?.dueDay).toBe('Day must be 1-31');
	});
});
