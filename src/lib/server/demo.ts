import { createLocalAccountIssuer } from '@better-auth/core/db';
import { hashPassword } from 'better-auth/crypto';
import { currentMonth, previousMonth } from '../domain/month';
import type { PrismaClient } from './generated/client';

export type DemoCredentials = { email: string; password: string };

// Shared by the app's demo sign-in action and prisma/seed.ts, so it takes the
// client and credentials as arguments instead of reading SvelteKit env.

export async function ensureDemoUser(db: PrismaClient, creds: DemoCredentials): Promise<string> {
	const existing = await db.user.findUnique({ where: { email: creds.email } });
	if (existing) return existing.id;

	const now = new Date();
	const userId = crypto.randomUUID();
	await db.user.create({
		data: {
			id: userId,
			name: 'Demo User',
			email: creds.email,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
			accounts: {
				create: {
					id: crypto.randomUUID(),
					accountId: userId,
					providerId: 'credential',
					issuer: createLocalAccountIssuer('credential'),
					password: await hashPassword(creds.password),
					createdAt: now,
					updatedAt: now
				}
			}
		}
	});
	return userId;
}

export async function resetDemoData(db: PrismaClient, userId: string): Promise<void> {
	await db.bill.deleteMany({ where: { userId } });
	await db.monthBudget.deleteMany({ where: { userId } });

	const month = currentMonth();
	const lastMonth = previousMonth(month);

	const sampleBills: {
		title: string;
		dueDay: number | null;
		isAutoPay: boolean;
		minPaymentCents: number | null;
		payUrl: string | null;
		paidThisMonth: boolean;
	}[] = [
		{
			title: 'Rent',
			dueDay: 1,
			isAutoPay: false,
			minPaymentCents: 185000,
			payUrl: 'https://example.com/rent',
			paidThisMonth: true
		},
		{
			title: 'Electric',
			dueDay: 12,
			isAutoPay: false,
			minPaymentCents: 9400,
			payUrl: 'https://example.com/electric',
			paidThisMonth: false
		},
		{
			title: 'Internet',
			dueDay: 15,
			isAutoPay: true,
			minPaymentCents: 7999,
			payUrl: 'https://example.com/internet',
			paidThisMonth: false
		},
		{
			title: 'Car Insurance',
			dueDay: 20,
			isAutoPay: true,
			minPaymentCents: 14250,
			payUrl: null,
			paidThisMonth: false
		},
		{
			title: 'Credit Card',
			dueDay: 25,
			isAutoPay: false,
			minPaymentCents: 3500,
			payUrl: 'https://example.com/card',
			paidThisMonth: false
		},
		{
			title: 'Streaming',
			dueDay: 8,
			isAutoPay: true,
			minPaymentCents: 1599,
			payUrl: null,
			paidThisMonth: true
		},
		{
			title: 'Water & Sewer',
			dueDay: null,
			isAutoPay: false,
			minPaymentCents: 6200,
			payUrl: null,
			paidThisMonth: false
		}
	];

	for (const sample of sampleBills) {
		await db.bill.create({
			data: {
				userId,
				title: sample.title,
				dueDay: sample.dueDay,
				isAutoPay: sample.isAutoPay,
				minPaymentCents: sample.minPaymentCents,
				payUrl: sample.payUrl,
				payments: {
					create: [
						{ month: lastMonth, paid: true, paidAt: new Date() },
						{
							month,
							paid: sample.paidThisMonth,
							paidAt: sample.paidThisMonth ? new Date() : null
						}
					]
				}
			}
		});
	}

	await db.monthBudget.create({
		data: { userId, month, balanceCents: 320000 }
	});
}
