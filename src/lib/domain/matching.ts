export type BankTxn = {
	id: string;
	// negative = money out, in cents
	amountCents: number;
	date: string; // ISO date
	description: string;
	counterparty: string | null;
};

export type MatchableBill = {
	id: number;
	title: string;
	minPaymentCents: number | null;
};

export type Match = { billId: number; txn: BankTxn };

export type MatchResult = {
	// amount and payee both line up: safe to auto-mark paid
	confident: Match[];
	// amount lines up but the payee doesn't: user confirms
	suggested: Match[];
};

const AMOUNT_TOLERANCE_CENTS = 100;

const tokenize = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length >= 3);

function payeeMatches(bill: MatchableBill, txn: BankTxn): boolean {
	const haystack = new Set(tokenize(`${txn.description} ${txn.counterparty ?? ''}`));
	const tokens = tokenize(bill.title);
	if (tokens.length === 0) return false;
	return tokens.some((t) => haystack.has(t));
}

function amountMatches(bill: MatchableBill, txn: BankTxn): boolean {
	if (bill.minPaymentCents === null || txn.amountCents >= 0) return false;
	return Math.abs(-txn.amountCents - bill.minPaymentCents) <= AMOUNT_TOLERANCE_CENTS;
}

// Pairs unpaid bills with outgoing transactions. Each bill and each
// transaction is used at most once; payee-confirmed pairs win over
// amount-only pairs.
export function matchTransactions(bills: MatchableBill[], txns: BankTxn[]): MatchResult {
	const candidates: (Match & { payee: boolean })[] = [];
	for (const bill of bills) {
		for (const txn of txns) {
			if (!amountMatches(bill, txn)) continue;
			candidates.push({ billId: bill.id, txn, payee: payeeMatches(bill, txn) });
		}
	}
	candidates.sort((a, b) => Number(b.payee) - Number(a.payee));

	const usedBills = new Set<number>();
	const usedTxns = new Set<string>();
	const confident: Match[] = [];
	const suggested: Match[] = [];
	for (const c of candidates) {
		if (usedBills.has(c.billId) || usedTxns.has(c.txn.id)) continue;
		usedBills.add(c.billId);
		usedTxns.add(c.txn.id);
		(c.payee ? confident : suggested).push({ billId: c.billId, txn: c.txn });
	}
	return { confident, suggested };
}
