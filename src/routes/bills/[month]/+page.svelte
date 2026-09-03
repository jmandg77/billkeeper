<script lang="ts">
	import BillForm from '$lib/components/BillForm.svelte';
	import SyncPanel from '$lib/components/SyncPanel.svelte';
	import BillRow from '$lib/components/BillRow.svelte';
	import MonthPicker from '$lib/components/MonthPicker.svelte';
	import SummaryBar from '$lib/components/SummaryBar.svelte';
	import { sortBills, splitSections, type BillView, type SortMode } from '$lib/domain/bills';
	import { formatMonth } from '$lib/domain/month';

	let { data, form } = $props();

	let editingBill = $state<BillView | null>(null);

	const SORT_KEY = 'billkeeper:sortMode';
	let sortMode = $state<SortMode>('dueDate');
	$effect(() => {
		try {
			const stored = window.localStorage.getItem(SORT_KEY);
			if (stored === 'alpha' || stored === 'dueDate') sortMode = stored;
		} catch {
			// storage unavailable; keep the default
		}
	});
	function setSortMode(mode: SortMode) {
		sortMode = mode;
		try {
			window.localStorage.setItem(SORT_KEY, mode);
		} catch {
			// storage unavailable; the choice just won't persist
		}
	}

	const sections = $derived.by(() => {
		const { toPay, autopay, paid } = splitSections(data.bills);
		return [
			{ title: 'To pay', bills: sortBills(toPay, sortMode) },
			{ title: 'Autopay', bills: sortBills(autopay, sortMode) },
			{ title: 'Paid', bills: sortBills(paid, sortMode) }
		].filter((s) => s.bills.length > 0 || s.title === 'Paid');
	});
	const balanceError = $derived(form?.intent === 'budget' ? form.errors?.balance : undefined);
	const syncError = $derived(
		form?.intent === 'syncBank' && 'errors' in form ? (form.errors?.sync ?? null) : null
	);
	const syncOutcome = $derived(
		form?.intent === 'syncBank' && 'sync' in form ? (form.sync ?? null) : null
	);
	const amountErrorFor = (billId: number) =>
		form?.intent === 'setAmount' && 'billId' in form && form.billId === billId
			? form.errors?.amount
			: undefined;
	// The sidebar posts cross-route to /new and /edit, whose failures aren't in
	// this page's ActionData type — hence the cast.
	const billFormErrors = $derived.by(() => {
		const f = form as { intent?: string; errors?: Record<string, string> } | null;
		return f?.intent === 'billForm' ? (f.errors ?? null) : null;
	});
</script>

<svelte:head><title>Bills — {formatMonth(data.month)}</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-2xl font-bold">Bills for {formatMonth(data.month)}</h1>
	<MonthPicker month={data.month} months={data.months} />
</div>

<SummaryBar
	bills={data.bills}
	budget={data.budget}
	canReset={data.bank?.accountId != null}
	{balanceError}
/>

{#if data.bank || !data.isDemo}
	<SyncPanel
		connected={data.bank !== null}
		lastSyncedAt={data.bank?.lastSyncedAt ?? null}
		sync={syncOutcome}
		error={syncError}
	/>
{/if}

<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
	<div class="hidden lg:sticky lg:top-6 lg:col-span-1 lg:block lg:self-start">
		<h2 class="mb-3 text-lg font-semibold">
			{editingBill ? `Edit ${editingBill.title}` : 'Add a bill'}
		</h2>
		{#key editingBill?.id ?? 'new'}
			<BillForm
				bill={editingBill}
				accounts={data.syncedAccounts}
				errors={billFormErrors}
				action={editingBill
					? `/bills/${data.month}/edit/${editingBill.id}`
					: `/bills/${data.month}/new`}
				oncancel={() => (editingBill = null)}
			/>
		{/key}
	</div>

	<div class="lg:col-span-2">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-lg font-semibold">This month</h2>
			{#if data.bills.length > 0}
				<div class="flex items-center gap-1 text-sm" role="group" aria-label="Sort bills">
					<span class="mr-1 text-gray-500">Sort:</span>
					<button
						onclick={() => setSortMode('dueDate')}
						class="rounded-md px-2 py-1 {sortMode === 'dueDate'
							? 'bg-indigo-600 text-white'
							: 'border border-gray-300 hover:bg-gray-100'}"
					>
						Due date
					</button>
					<button
						onclick={() => setSortMode('alpha')}
						class="rounded-md px-2 py-1 {sortMode === 'alpha'
							? 'bg-indigo-600 text-white'
							: 'border border-gray-300 hover:bg-gray-100'}"
					>
						A&ndash;Z
					</button>
				</div>
			{/if}
		</div>
		{#if data.bills.length === 0}
			<p class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
				No bills yet — add your first one
				<span class="lg:hidden">below</span><span class="hidden lg:inline">on the left</span>.
			</p>
		{:else}
			{#each sections as section (section.title)}
				<h3
					class="mt-5 mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase first:mt-0"
				>
					{section.title}
				</h3>
				{#if section.bills.length === 0}
					<p class="text-sm text-gray-400">Nothing paid this month</p>
				{:else}
					<ul class="space-y-3">
						{#each section.bills as bill (bill.id)}
							<BillRow
								{bill}
								month={data.month}
								amountError={amountErrorFor(bill.id)}
								onedit={(b) => (editingBill = b)}
							/>
						{/each}
					</ul>
				{/if}
			{/each}
		{/if}
		<a
			href={`/bills/${data.month}/new`}
			class="mt-3 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 lg:hidden"
		>
			<span class="text-lg leading-none">+</span> Add a bill
		</a>
	</div>
</div>
