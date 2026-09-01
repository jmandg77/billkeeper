<script lang="ts">
	import { enhance } from '$app/forms';
	import type { BillView } from '$lib/domain/bills';
	import { formatCents } from '$lib/domain/money';

	let { bill, onedit }: { bill: BillView; onedit: (bill: BillView) => void } = $props();
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
		{#if bill.minPaymentCents !== null}
			<span class="font-semibold {bill.paid ? 'text-gray-400' : ''}">
				{formatCents(bill.minPaymentCents)}
			</span>
		{/if}
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
