// Read-only bank sync. SimpleFIN today; a Teller provider would slot in as a
// sibling of simplefin.ts with its own claim + fetch. See docs/bank-sync.md.
import { db } from '../db';
import { claimSetupToken, fetchAccounts } from './simplefin';

export type ConnectionSummary = {
	institution: string | null;
	lastSyncedAt: string | null;
};

export async function getConnection(userId: string): Promise<ConnectionSummary | null> {
	const connection = await db.bankConnection.findUnique({
		where: { userId_provider: { userId, provider: 'simplefin' } }
	});
	if (!connection?.secret) return null;
	return {
		institution: connection.institution,
		lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null
	};
}

export async function connectSimplefin(userId: string, setupToken: string): Promise<void> {
	const accessUrl = await claimSetupToken(setupToken);
	// Probe the access URL so a bad token fails here, not at first sync.
	const accounts = await fetchAccounts(accessUrl, { balancesOnly: true });
	const institution = accounts[0]?.org?.name ?? accounts[0]?.org?.domain ?? null;
	await db.bankConnection.upsert({
		where: { userId_provider: { userId, provider: 'simplefin' } },
		update: { secret: accessUrl, institution, status: 'connected', lastSyncedAt: null },
		create: { userId, provider: 'simplefin', secret: accessUrl, institution, status: 'connected' }
	});
}

export async function disconnectBank(userId: string): Promise<void> {
	await db.bankConnection.deleteMany({ where: { userId, provider: 'simplefin' } });
}
