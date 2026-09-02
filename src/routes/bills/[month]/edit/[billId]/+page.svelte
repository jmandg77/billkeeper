<script lang="ts">
	import BillForm from '$lib/components/BillForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Edit {data.bill.title}</title></svelte:head>

<div class="mx-auto max-w-xl">
	<h1 class="mb-4 text-2xl font-bold">Edit {data.bill.title}</h1>
	<BillForm
		bill={data.bill}
		accounts={data.syncedAccounts}
		errors={form?.errors ?? null}
		cancelHref={`/bills/${data.month}`}
	/>
</div>
