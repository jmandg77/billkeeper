<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatCents } from '$lib/domain/money';
	import type { SyncOutcome } from '$lib/server/banksync/sync';

	let {
		connected,
		lastSyncedAt,
		sync = null,
		error = null
	}: {
		connected: boolean;
		lastSyncedAt: string | null;
		sync?: SyncOutcome | null;
		error?: string | null;
	} = $props();

	let syncing = $state(false);

	const lastSynced = $derived(
		lastSyncedAt
			? new Date(lastSyncedAt).toLocaleString('en-US', {
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: null
	);
</script>

<div class="mb-6">
	<div class="flex items-center justify-start gap-3">
		{#if connected}
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
					{syncing ? 'Syncing…' : 'Sync linked accounts'}
				</button>
			</form>
			<span class="text-xs text-gray-400">
				{lastSynced ? `Last synced ${lastSynced}` : 'Not synced yet'}
			</span>
		{:else}
			<a href={resolve('/settings')} class="text-sm text-indigo-600 underline">
				Set up bank sync in Settings
			</a>
		{/if}
	</div>

	{#if error}
		<p class="mt-2 text-sm text-red-600">{error}</p>
	{/if}

	{#if sync}
		<div class="mt-3 space-y-2 rounded-lg border border-gray-200 bg-white p-4">
			<p class="text-sm text-gray-600">
				Refreshed {sync.accountsRefreshed}
				{sync.accountsRefreshed === 1 ? 'account balance' : 'account balances'}.
				{#if sync.balanceCents !== null}
					Balance set to {formatCents(sync.balanceCents)} from your account.
				{/if}
			</p>
			{#if sync.autoMarked.length === 0 && sync.suggested.length === 0}
				<p class="text-sm text-gray-500">No new payments matched your unpaid bills.</p>
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
</div>
