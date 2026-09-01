// Read-only bank sync. SimpleFIN today; a Teller provider would slot in as a
// sibling of simplefin.ts with its own claim + fetch. See docs/bank-sync.md.
import { db } from '../db';
import { claimSetupToken, fetchAccounts } from './simplefin';

export type ConnectionSummary = {
	institution: string | null;
	lastSyncedAt: string | null;
	accountId: string | null;
	accountName: string | null;
};

export type BankAccountOption = { id: string; name: string };

export async function getConnection(userId: string): Promise<ConnectionSummary | null> {
	const connection = await db.bankConnection.findUnique({
		where: { userId_provider: { userId, provider: 'simplefin' } }
	});
	if (!connection?.secret) return null;
	return {
		institution: connection.institution,
		lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
		accountId: connection.accountId,
		accountName: connection.accountName
	};
}

export async function connectSimplefin(userId: string, setupToken: string): Promise<void> {
	const accessUrl = await claimSetupToken(setupToken);
	// Probe the access URL so a bad token fails here, not at first sync.
	const accounts = await fetchAccounts(accessUrl, { balancesOnly: true });
	const institution = accounts[0]?.org?.name ?? accounts[0]?.org?.domain ?? null;
	// With a single shared account there is nothing to choose.
	const only = accounts.length === 1 ? accounts[0] : null;
	await db.bankConnection.upsert({
		where: { userId_provider: { userId, provider: 'simplefin' } },
		update: {
			secret: accessUrl,
			institution,
			status: 'connected',
			lastSyncedAt: null,
			accountId: only?.id ?? null,
			accountName: only?.name ?? null
		},
		create: {
			userId,
			provider: 'simplefin',
			secret: accessUrl,
			institution,
			status: 'connected',
			accountId: only?.id ?? null,
			accountName: only?.name ?? null
		}
	});
}

export async function listBankAccounts(userId: string): Promise<BankAccountOption[]> {
	const connection = await db.bankConnection.findUnique({
		where: { userId_provider: { userId, provider: 'simplefin' } }
	});
	if (!connection?.secret) throw new Error('No bank connection');
	const accounts = await fetchAccounts(connection.secret, { balancesOnly: true });
	return accounts.map((a) => ({ id: a.id, name: a.name }));
}

export async function setBankAccount(
	userId: string,
	account: BankAccountOption | null
): Promise<void> {
	await db.bankConnection.update({
		where: { userId_provider: { userId, provider: 'simplefin' } },
		data: { accountId: account?.id ?? null, accountName: account?.name ?? null }
	});
}

export async function disconnectBank(userId: string): Promise<void> {
	await db.bankConnection.deleteMany({ where: { userId, provider: 'simplefin' } });
}
