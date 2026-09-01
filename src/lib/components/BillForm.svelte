<script lang="ts">
	import { enhance } from '$app/forms';
	import type { BillView } from '$lib/domain/bills';
	import { centsToInput } from '$lib/domain/money';

	let {
		bill = null,
		errors = null,
		oncancel
	}: {
		bill?: BillView | null;
		errors?: Record<string, string> | null;
		oncancel?: () => void;
	} = $props();

	const editing = $derived(bill !== null);
</script>

<form
	method="POST"
	action={editing ? '?/update' : '?/create'}
	class="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
	use:enhance={({ formElement }) =>
		async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				formElement.reset();
				oncancel?.();
			}
		}}
>
	{#if editing && bill}
		<input type="hidden" name="billId" value={bill.id} />
	{/if}

	<div>
		<label class="block text-sm font-medium" for="title">Title</label>
		<input
			id="title"
			name="title"
			required
			value={bill?.title ?? ''}
			class="mt-1 w-full rounded-md border-gray-300 text-sm"
			placeholder="Electric"
		/>
		{#if errors?.title}<p class="mt-1 text-xs text-red-600">{errors.title}</p>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div>
			<label class="block text-sm font-medium" for="dueDay">Due day</label>
			<input
				id="dueDay"
				name="dueDay"
				type="number"
				min="1"
				max="31"
				value={bill?.dueDay ?? ''}
				class="mt-1 w-full rounded-md border-gray-300 text-sm"
				placeholder="15"
			/>
			{#if errors?.dueDay}<p class="mt-1 text-xs text-red-600">{errors.dueDay}</p>{/if}
		</div>
		<div>
			<label class="block text-sm font-medium" for="minPayment">Amount</label>
			<input
				id="minPayment"
				name="minPayment"
				inputmode="decimal"
				value={centsToInput(bill?.minPaymentCents ?? null)}
				class="mt-1 w-full rounded-md border-gray-300 text-sm"
				placeholder="84.20"
			/>
			{#if errors?.minPayment}<p class="mt-1 text-xs text-red-600">{errors.minPayment}</p>{/if}
		</div>
	</div>

	<div>
		<label class="block text-sm font-medium" for="payUrl">Payment page URL</label>
		<input
			id="payUrl"
			name="payUrl"
			type="url"
			value={bill?.payUrl ?? ''}
			class="mt-1 w-full rounded-md border-gray-300 text-sm"
			placeholder="https://billing.example.com"
		/>
		{#if errors?.payUrl}<p class="mt-1 text-xs text-red-600">{errors.payUrl}</p>{/if}
	</div>

	<div>
		<label class="block text-sm font-medium" for="notifyDaysBefore">
			Remind me (days before due)
		</label>
		<input
			id="notifyDaysBefore"
			name="notifyDaysBefore"
			type="number"
			min="0"
			max="28"
			value={bill?.notifyDaysBefore ?? ''}
			class="mt-1 w-full rounded-md border-gray-300 text-sm"
			placeholder="off"
		/>
		{#if errors?.notifyDaysBefore}
			<p class="mt-1 text-xs text-red-600">{errors.notifyDaysBefore}</p>
		{/if}
	</div>

	<label class="flex items-center gap-2 text-sm">
		<input
			type="checkbox"
			name="isAutoPay"
			checked={bill?.isAutoPay ?? false}
			class="rounded border-gray-300"
		/>
		Autopay
	</label>

	{#if errors?.form}<p class="text-xs text-red-600">{errors.form}</p>{/if}

	<div class="flex gap-2">
		<button
			class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
		>
			{editing ? 'Save changes' : 'Add bill'}
		</button>
		{#if editing}
			<button
				type="button"
				onclick={() => oncancel?.()}
				class="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
			>
				Cancel
			</button>
		{/if}
	</div>
</form>
