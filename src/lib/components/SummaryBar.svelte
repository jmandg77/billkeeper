<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		paidCents,
		remainingCents,
		totalCents,
		unpaidCents,
		type BillView
	} from '$lib/domain/bills';
	import { centsToInput, formatCents } from '$lib/domain/money';

	let {
		bills,
		budgetCents,
		balanceError
	}: { bills: BillView[]; budgetCents: number; balanceError?: string } = $props();

	let editingBalance = $state(false);

	const remaining = $derived(remainingCents(budgetCents, bills));
</script>

<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="text-sm text-gray-500">Total bills</p>
		<p class="mt-1 text-xl font-semibold">{formatCents(totalCents(bills))}</p>
	</div>
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="text-sm text-gray-500">Paid</p>
		<p class="mt-1 text-xl font-semibold text-green-700">{formatCents(paidCents(bills))}</p>
	</div>
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="text-sm text-gray-500">Still due</p>
		<p class="mt-1 text-xl font-semibold text-amber-700">{formatCents(unpaidCents(bills))}</p>
	</div>
	<div class="rounded-lg border border-gray-200 bg-white p-4">
		<p class="text-sm text-gray-500">Balance after paid bills</p>
		{#if editingBalance}
			<form
				method="POST"
				action="?/budget"
				class="mt-1 flex items-center gap-2"
				use:enhance={() =>
					async ({ update }) => {
						editingBalance = false;
						await update();
					}}
			>
				<input
					name="balance"
					value={centsToInput(budgetCents)}
					class="w-28 rounded-md border-gray-300 text-sm"
				/>
				<button class="rounded-md bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-500">
					Save
				</button>
			</form>
		{:else}
			<button
				class="mt-1 text-left text-xl font-semibold hover:text-indigo-600"
				title="Set this month's bank balance"
				onclick={() => (editingBalance = true)}
			>
				{budgetCents === 0 ? 'Set balance' : formatCents(remaining)}
			</button>
			{#if budgetCents !== 0}
				<p class="text-xs text-gray-400">from {formatCents(budgetCents)} balance</p>
			{/if}
		{/if}
		{#if balanceError}
			<p class="mt-1 text-xs text-red-600">{balanceError}</p>
		{/if}
	</div>
</div>
