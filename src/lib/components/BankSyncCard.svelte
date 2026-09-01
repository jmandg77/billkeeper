<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatCents } from '$lib/domain/money';
	import type { BankAccountOption, ConnectionSummary } from '$lib/server/banksync';
	import type { SyncOutcome } from '$lib/server/banksync/sync';

	let {
		bank,
		sync = null,
		accounts = null,
		errors = null
	}: {
		bank: ConnectionSummary | null;
		sync?: SyncOutcome | null;
		accounts?: BankAccountOption[] | null;
		errors?: Record<string, string> | null;
	} = $props();

	let showConnect = $state(false);
	let syncing = $state(false);

	const lastSynced = $derived(
		bank?.lastSyncedAt
			? new Date(bank.lastSyncedAt).toLocaleString('en-US', {
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: null
	);
</script>

<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4">
	{#if !bank}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="font-medium">Bank sync</p>
				<p class="text-sm text-gray-500">
					Connect your checking account via
					<a
						href="https://beta-bridge.simplefin.org"
						target="_blank"
						rel="noopener noreferrer"
						class="text-indigo-600 underline">SimpleFIN Bridge</a
					>
					and paid bills get detected automatically. Read-only; revocable there anytime.
				</p>
			</div>
			<button
				onclick={() => (showConnect = !showConnect)}
				class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
			>
				Connect bank
			</button>
		</div>
		{#if showConnect}
			<form
				method="POST"
				action="?/connectBank"
				class="mt-3 flex flex-wrap items-start gap-2"
				use:enhance
			>
				<div class="min-w-64 flex-1">
					<input
						name="setupToken"
						placeholder="Paste your SimpleFIN setup token"
						class="w-full rounded-md border-gray-300 text-sm"
						autocomplete="off"
					/>
					{#if errors?.setupToken}
						<p class="mt-1 text-xs text-red-600">{errors.setupToken}</p>
					{/if}
				</div>
				<button
					class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
				>
					Connect
				</button>
			</form>
		{/if}
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="font-medium">
					{bank.institution ?? 'Bank'} connected
					<span class="ml-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
				</p>
				<div class="text-sm text-gray-500">
					{lastSynced ? `Last synced ${lastSynced}` : 'Not synced yet'}
					&middot;
					{#if bank.accountName}
						syncing <strong>{bank.accountName}</strong>
					{:else}
						syncing <strong>all accounts</strong>
					{/if}
					<form method="POST" action="?/listBankAccounts" class="inline" use:enhance>
						<button class="text-indigo-600 underline">change</button>
					</form>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<form
					method="POST"
					action="?/syncBank"
					use:enhance={() => {
						syncing = true;
						return async ({ update }) => {
							syncing = false;
							await update();
						};
					}}
				>
					<button
						disabled={syncing}
						class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
					>
						{syncing ? 'Syncing…' : 'Sync now'}
					</button>
				</form>
				<form
					method="POST"
					action="?/disconnectBank"
					use:enhance
					onsubmit={(e) => {
						if (!confirm('Disconnect your bank? You can reconnect with a new setup token.')) {
							e.preventDefault();
						}
					}}
				>
					<button class="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
						>Disconnect</button
					>
				</form>
			</div>
		</div>

		{#if errors?.sync}
			<p class="mt-2 text-sm text-red-600">{errors.sync}</p>
		{/if}

		{#if accounts}
			<form
				method="POST"
				action="?/setBankAccount"
				class="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-sm"
				use:enhance
			>
				<label for="bank-account" class="text-gray-600">Match bills against</label>
				<select
					id="bank-account"
					name="accountId"
					class="rounded-md border-gray-300 text-sm"
					onchange={(e) => {
						const option = e.currentTarget.selectedOptions[0];
						const nameInput = e.currentTarget.form?.elements.namedItem('accountName');
						if (nameInput instanceof HTMLInputElement) nameInput.value = option?.text ?? '';
					}}
				>
					<option value="">All accounts</option>
					{#each accounts as account (account.id)}
						<option value={account.id} selected={account.id === bank.accountId}>
							{account.name}
						</option>
					{/each}
				</select>
				<input type="hidden" name="accountName" value={bank.accountName ?? ''} />
				<button
					class="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
				>
					Save
				</button>
			</form>
		{/if}

		{#if sync}
			<div class="mt-3 space-y-2 border-t border-gray-100 pt-3">
				{#if sync.balanceCents !== null}
					<p class="text-sm text-gray-600">
						Balance set to {formatCents(sync.balanceCents)} from your account.
					</p>
				{/if}
				{#if sync.autoMarked.length === 0 && sync.suggested.length === 0}
					<p class="text-sm text-gray-500">Synced — no new payments matched your unpaid bills.</p>
				{/if}
				{#each sync.autoMarked as match (match.txnId)}
					<p class="text-sm text-green-700">
						Marked <strong>{match.title}</strong> paid — {formatCents(-match.amountCents)}
						&ldquo;{match.description}&rdquo; on {match.date}
					</p>
				{/each}
				{#each sync.suggested as match (match.txnId)}
					<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
						<p class="text-amber-800">
							Looks like <strong>{match.title}</strong> — {formatCents(-match.amountCents)}
							&ldquo;{match.description}&rdquo; on {match.date}
						</p>
						<form method="POST" action="?/acceptMatch" use:enhance>
							<input type="hidden" name="billId" value={match.billId} />
							<input type="hidden" name="txnId" value={match.txnId} />
							<input type="hidden" name="txnDate" value={match.date} />
							<button
								class="rounded-md border border-green-600 px-2.5 py-1 text-sm font-medium text-green-700 hover:bg-green-50"
							>
								Mark paid
							</button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
