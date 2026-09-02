<script lang="ts">
	import BillForm from '$lib/components/BillForm.svelte';
	import { formatMonth } from '$lib/domain/month';

	let { data, form } = $props();
</script>

<svelte:head><title>Add a bill — {formatMonth(data.month)}</title></svelte:head>

<div class="mx-auto max-w-xl">
	<h1 class="mb-4 text-2xl font-bold">Add a bill</h1>
	<BillForm
		accounts={data.syncedAccounts}
		errors={form?.errors ?? null}
		cancelHref={`/bills/${data.month}`}
	/>
</div>
