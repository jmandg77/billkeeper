import type { BankTxn } from '../../domain/matching';

// SimpleFIN protocol: https://www.simplefin.org/protocol.html
// A setup token is a base64-encoded one-time claim URL; POSTing it returns an
// access URL with embedded basic-auth credentials that we store per user.

export type SimplefinTxn = {
	id: string;
	posted: number; // unix seconds, 0 while pending
	amount: string; // signed decimal string, negative = money out
	description: string;
	payee?: string;
	pending?: boolean;
};

export type SimplefinAccount = {
	id: string;
	name: string;
	org?: { name?: string; domain?: string };
	balance: string;
	transactions?: SimplefinTxn[];
};

export function decodeSetupToken(token: string): string {
	let url: string;
	try {
		url = Buffer.from(token.trim(), 'base64').toString('utf8').trim();
	} catch {
		throw new Error('That does not look like a SimpleFIN setup token');
	}
	if (!/^https:\/\/\S+$/.test(url)) {
		throw new Error('That does not look like a SimpleFIN setup token');
	}
	return url;
}

export async function claimSetupToken(token: string): Promise<string> {
	const claimUrl = decodeSetupToken(token);
	const res = await fetch(claimUrl, { method: 'POST', headers: { 'Content-Length': '0' } });
	if (!res.ok) {
		throw new Error(
			res.status === 403
				? 'This setup token was already used — generate a new one on the SimpleFIN Bridge'
				: `SimpleFIN claim failed (${res.status})`
		);
	}
	const accessUrl = (await res.text()).trim();
	if (!accessUrl.startsWith('https://'))
		throw new Error('SimpleFIN returned an unexpected access URL');
	return accessUrl;
}

// fetch() rejects URLs with embedded credentials, so split them into a header.
export function splitAccessUrl(accessUrl: string): { base: string; authorization: string } {
	const url = new URL(accessUrl);
	const authorization =
		'Basic ' +
		Buffer.from(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`).toString(
			'base64'
		);
	url.username = '';
	url.password = '';
	return { base: url.toString().replace(/\/$/, ''), authorization };
}

export async function fetchAccounts(
	accessUrl: string,
	opts: { startDate?: number; balancesOnly?: boolean } = {}
): Promise<SimplefinAccount[]> {
	const { base, authorization } = splitAccessUrl(accessUrl);
	const params = new URLSearchParams();
	if (opts.startDate !== undefined) params.set('start-date', String(opts.startDate));
	if (opts.balancesOnly) params.set('balances-only', '1');
	const res = await fetch(`${base}/accounts?${params}`, { headers: { authorization } });
	if (res.status === 403) throw new Error('SimpleFIN access was revoked — reconnect your bank');
	if (!res.ok) throw new Error(`SimpleFIN request failed (${res.status})`);
	const body = (await res.json()) as { accounts?: SimplefinAccount[] };
	return body.accounts ?? [];
}

// "-123.4" → -12340; returns null for anything that isn't a plain decimal.
export function amountToCents(amount: string): number | null {
	const m = amount.trim().match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
	if (!m) return null;
	const [, sign, dollars, fraction = ''] = m;
	const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0') || '0');
	return sign === '-' ? -cents : cents;
}

export function toBankTxns(account: SimplefinAccount): BankTxn[] {
	return (account.transactions ?? [])
		.filter((t) => !t.pending && t.posted > 0)
		.flatMap((t) => {
			const amountCents = amountToCents(t.amount);
			if (amountCents === null) return [];
			return [
				{
					id: t.id,
					amountCents,
					date: new Date(t.posted * 1000).toISOString().slice(0, 10),
					description: t.description,
					counterparty: t.payee ?? null
				}
			];
		});
}
