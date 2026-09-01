<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();
</script>

<svelte:head><title>Settings — billkeeper</title></svelte:head>

<div class="mx-auto max-w-xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Settings</h1>
		<a href={resolve('/bills')} class="text-sm text-indigo-600 underline">Back to bills</a>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white p-5">
		<h2 class="font-semibold">Due reminders</h2>
		<p class="mt-1 text-sm text-gray-500">
			Bills with a &ldquo;remind me&rdquo; setting send an email that many days before their due
			day. Reminders go to the addresses below — one per line. Leave empty to use
			<strong>{data.loginEmail}</strong>.
		</p>
		<p class="mt-2 text-sm text-gray-500">
			To also get a text, add your carrier's email-to-text address, e.g.
			<code class="rounded bg-gray-100 px-1">5551234567@vtext.com</code> (Verizon) or
			<code class="rounded bg-gray-100 px-1">5551234567@tmomail.net</code> (T-Mobile).
		</p>

		<form method="POST" action="?/save" class="mt-4 space-y-3" use:enhance>
			<textarea
				name="reminderEmails"
				rows="4"
				class="w-full rounded-md border-gray-300 text-sm"
				placeholder={data.loginEmail}>{data.reminderEmails.join('\n')}</textarea
			>
			{#if form?.error}
				<p class="text-sm text-red-600">{form.error}</p>
			{/if}
			{#if form?.saved}
				<p class="text-sm text-green-700">Saved.</p>
			{/if}
			<button
				class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
			>
				Save
			</button>
		</form>
	</div>
</div>
