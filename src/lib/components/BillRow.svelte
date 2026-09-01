<script lang="ts">
	import { enhance } from '$app/forms';
	import type { BillView } from '$lib/domain/bills';
	import { centsToInput, formatCents } from '$lib/domain/money';

	let {
		bill,
		amountError,
		onedit
	}: { bill: BillView; amountError?: string; onedit: (bill: BillView) => void } = $props();

	let editingAmount = $state(false);
</script>

<li
	class="flex items-center justify-between gap-4 rounded-lg border bg-white p-4
	{bill.paid ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}"
>
	<div class="flex min-w-0 items-center gap-3">
		<form method="POST" action="?/setPaid" use:enhance>
			<input type="hidden" name="billId" value={bill.id} />
			<input type="hidden" name="paid" value={String(!bill.paid)} />
			<button
				class="flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold
				{bill.paid
					? 'border-green-600 bg-green-600 text-white'
					: 'border-gray-300 text-transparent hover:border-green-500'}"
				title={bill.paid ? 'Mark unpaid' : 'Mark paid'}
			>
				&#10003;
			</button>
		</form>
		<div class="min-w-0">
			<p class="truncate font-medium {bill.paid ? 'text-gray-500 line-through' : ''}">
				{bill.title}
			</p>
			<p class="text-xs text-gray-500">
				{#if bill.dueDay}Due on the {bill.dueDay}{['th', 'st', 'nd', 'rd'][
						bill.dueDay % 10 > 3 || Math.floor((bill.dueDay % 100) / 10) === 1
							? 0
							: bill.dueDay % 10
					]}{:else}No due date{/if}
				{#if bill.isAutoPay}
					&middot; <span class="text-indigo-600">autopay</span>
				{/if}
				{#if bill.notifyDaysBefore !== null && bill.dueDay}
					&middot;
					<span title="Reminder {bill.notifyDaysBefore} day(s) before due">
						&#128276; {bill.notifyDaysBefore}d
					</span>
				{/if}
			</p>
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-3">
		<div class="text-right">
			{#if editingAmount && !bill.paid}
				<form
					method="POST"
					action="?/setAmount"
					class="flex items-center gap-1"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'success') editingAmount = false;
							await update();
						}}
				>
					<input type="hidden" name="billId" value={bill.id} />
					<!-- svelte-ignore a11y_autofocus -->
					<input
						name="amount"
						value={centsToInput(bill.minPaymentCents)}
						class="w-24 rounded-md border-gray-300 text-right text-sm"
						autofocus
						onkeydown={(e) => {
							if (e.key === 'Escape') editingAmount = false;
						}}
					/>
					<button class="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500">
						Save
					</button>
				</form>
			{:else if bill.paid}
				{#if bill.minPaymentCents !== null}
					<span class="font-semibold text-gray-400">{formatCents(bill.minPaymentCents)}</span>
				{/if}
			{:else}
				<button
					class="font-semibold hover:text-indigo-600"
					title="Edit amount"
					onclick={() => (editingAmount = true)}
				>
					{bill.minPaymentCents !== null ? formatCents(bill.minPaymentCents) : 'Set amount'}
				</button>
			{/if}
			{#if amountError && !bill.paid}
				<p class="text-xs text-red-600">{amountError}</p>
			{/if}
			{#if bill.linkedBalanceCents !== null}
				<p class="text-xs text-gray-400" title="Current account balance from last sync">
					bal {formatCents(Math.abs(bill.linkedBalanceCents))}
				</p>
			{/if}
		</div>
		{#if bill.payUrl}
			<a
				href={bill.payUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
			>
				Pay &nearr;
			</a>
		{/if}
		<button
			onclick={() => onedit(bill)}
			class="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm hover:bg-gray-100"
		>
			Edit
		</button>
		<form
			method="POST"
			action="?/delete"
			use:enhance
			onsubmit={(e) => {
				if (!confirm(`Delete "${bill.title}"? This removes it from every month.`)) {
					e.preventDefault();
				}
			}}
		>
			<input type="hidden" name="billId" value={bill.id} />
			<button
				class="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
				title="Delete bill"
			>
				Delete
			</button>
		</form>
	</div>
</li>
