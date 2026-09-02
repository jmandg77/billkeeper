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
	await db.bankAccount.deleteMany({ where: { userId } });

	const month = currentMonth();
	const lastMonth = previousMonth(month);
	const now = new Date();
	const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

	// Fake "synced" accounts so linked bills can show a live balance line.
	const demoAccounts = [
		{
			accountId: 'demo-checking',
			name: 'Checking (1234)',
			orgName: 'Demo Bank',
			balanceCents: 320000
		},
		{
			accountId: 'demo-visa',
			name: 'Rewards Visa (5678)',
			orgName: 'Demo Card Co',
			balanceCents: -243787
		},
		{
			accountId: 'demo-store',
			name: 'Store Card (9012)',
			orgName: 'Demo Card Co',
			balanceCents: -41562
		}
	];
	for (const account of demoAccounts) {
		await db.bankAccount.create({ data: { userId, ...account, syncedAt: anHourAgo } });
	}

	const sampleBills: {
		title: string;
		dueDay: number | null;
		isAutoPay: boolean;
		minPaymentCents: number | null;
		payUrl: string | null;
		notifyDaysBefore: number | null;
		linkedAccountId: string | null;
		paidThisMonth: boolean;
	}[] = [
		{
			title: 'Rent',
			dueDay: 1,
			isAutoPay: false,
			minPaymentCents: 185000,
			payUrl: 'https://example.com/rent',
			notifyDaysBefore: 5,
			linkedAccountId: null,
			paidThisMonth: true
		},
		{
			title: 'Electric',
			dueDay: 12,
			isAutoPay: false,
			minPaymentCents: 9400,
			payUrl: 'https://example.com/electric',
			notifyDaysBefore: 3,
			linkedAccountId: null,
			paidThisMonth: false
		},
		{
			title: 'Internet',
			dueDay: 15,
			isAutoPay: true,
			minPaymentCents: 7999,
			payUrl: 'https://example.com/internet',
			notifyDaysBefore: null,
			linkedAccountId: null,
			paidThisMonth: false
		},
		{
			title: 'Car Insurance',
			dueDay: 20,
			isAutoPay: true,
			minPaymentCents: 14250,
			payUrl: null,
			notifyDaysBefore: null,
			linkedAccountId: null,
			paidThisMonth: false
		},
		{
			title: 'Rewards Visa',
			dueDay: 25,
			isAutoPay: false,
			minPaymentCents: 40000,
			payUrl: 'https://example.com/card',
			notifyDaysBefore: 4,
			linkedAccountId: 'demo-visa',
			paidThisMonth: false
		},
		{
			title: 'Store Card',
			dueDay: 18,
			isAutoPay: false,
			minPaymentCents: 41562,
			payUrl: null,
			notifyDaysBefore: null,
			linkedAccountId: 'demo-store',
			paidThisMonth: true
		},
		{
			title: 'Streaming',
			dueDay: 8,
			isAutoPay: true,
			minPaymentCents: 1599,
			payUrl: null,
			notifyDaysBefore: null,
			linkedAccountId: null,
			paidThisMonth: true
		},
		{
			title: 'Water & Sewer',
			dueDay: null,
			isAutoPay: false,
			minPaymentCents: 6200,
			payUrl: null,
			notifyDaysBefore: null,
			linkedAccountId: null,
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
				notifyDaysBefore: sample.notifyDaysBefore,
				linkedAccountId: sample.linkedAccountId,
				payments: {
					create: [
						{ month: lastMonth, paid: true, paidAt: anHourAgo },
						{
							month,
							paid: sample.paidThisMonth,
							paidAt: sample.paidThisMonth ? anHourAgo : null
						}
					]
				}
			}
		});
	}

	// Balance taken "after" the already-paid bills cleared, so only newly
	// marked bills deduct from it — mirroring the bank-synced flow.
	await db.monthBudget.create({
		data: { userId, month, balanceCents: 320000, balanceAsOf: now }
	});
}
