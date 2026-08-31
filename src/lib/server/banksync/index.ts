// Seam for read-only bank sync. Implementations (Teller first, SimpleFIN as an
// alternative) plug in here without touching the rest of the app.
// See docs/bank-sync.md for the integration plan.

export type BankTransaction = {
	id: string;
	postedAt: Date;
	amountCents: number;
	description: string;
};

export type ConnectionHandle = {
	provider: string;
	secret: string;
};

export interface BankSyncProvider {
	readonly id: 'teller' | 'simplefin';
	// Exchange whatever the provider's connect flow returns for a storable secret.
	completeConnection(payload: unknown): Promise<ConnectionHandle>;
	listTransactions(connection: ConnectionHandle, since: Date): Promise<BankTransaction[]>;
}

export const bankSyncProviders: Partial<Record<BankSyncProvider['id'], BankSyncProvider>> = {};
