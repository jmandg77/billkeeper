<script lang="ts">
	import BankSyncCard from '$lib/components/BankSyncCard.svelte';
	import BillForm from '$lib/components/BillForm.svelte';
	import BillRow from '$lib/components/BillRow.svelte';
	import MonthPicker from '$lib/components/MonthPicker.svelte';
	import SummaryBar from '$lib/components/SummaryBar.svelte';
	import { sortBills, type BillView } from '$lib/domain/bills';
	import { formatMonth } from '$lib/domain/month';

	let { data, form } = $props();

	let editingBill = $state<BillView | null>(null);

	const sorted = $derived(sortBills(data.bills));
	const createErrors = $derived(form?.intent === 'create' ? (form.errors ?? null) : null);
	const updateErrors = $derived(form?.intent === 'update' ? (form.errors ?? null) : null);
	const balanceError = $derived(form?.intent === 'budget' ? form.errors?.balance : undefined);
	const bankErrors = $derived(
		form?.intent === 'connectBank' || form?.intent === 'syncBank' ? (form.errors ?? null) : null
	);
	const syncOutcome = $derived(
		form?.intent === 'syncBank' && 'sync' in form ? (form.sync ?? null) : null
	);
</script>

<svelte:head><title>Bills — {formatMonth(data.month)}</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-2xl font-bold">Bills for {formatMonth(data.month)}</h1>
	<MonthPicker month={data.month} months={data.months} />
</div>

<SummaryBar bills={data.bills} budgetCents={data.budgetCents} {balanceError} />

{#if !data.isDemo}
	<BankSyncCard bank={data.bank} sync={syncOutcome} errors={bankErrors} />
{/if}

<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
	<div class="lg:col-span-1">
		<h2 class="mb-3 text-lg font-semibold">
			{editingBill ? `Edit ${editingBill.title}` : 'Add a bill'}
		</h2>
		{#key editingBill?.id ?? 'new'}
			<BillForm
				bill={editingBill}
				errors={editingBill ? updateErrors : createErrors}
				oncancel={() => (editingBill = null)}
			/>
		{/key}
	</div>

	<div class="lg:col-span-2">
		<h2 class="mb-3 text-lg font-semibold">This month</h2>
		{#if sorted.length === 0}
			<p class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
				No bills yet. Add your first one on the left.
			</p>
		{:else}
			<ul class="space-y-3">
				{#each sorted as bill (bill.id)}
					<BillRow {bill} onedit={(b) => (editingBill = b)} />
				{/each}
			</ul>
		{/if}
	</div>
</div>
