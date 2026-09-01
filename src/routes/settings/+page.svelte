<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatCents } from '$lib/domain/money';

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
			{#if form?.intent === 'save' && form?.error}
				<p class="text-sm text-red-600">{form.error}</p>
			{/if}
			{#if form?.intent === 'save' && 'saved' in form}
				<p class="text-sm text-green-700">Saved.</p>
			{/if}
			<button
				class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
			>
				Save
			</button>
		</form>
	</div>

	{#if data.syncedAccounts.length > 0}
		<div class="mt-6 rounded-lg border border-gray-200 bg-white p-5">
			<h2 class="font-semibold">Synced accounts</h2>
			<p class="mt-1 text-sm text-gray-500">
				Accounts your bank connection shares, refreshed on every sync. Link a bill to one (in the
				bill's edit form) and its amount follows the account balance.
			</p>
			<ul class="mt-3 divide-y divide-gray-100">
				{#each data.syncedAccounts as account (account.accountId)}
					<li class="flex items-center justify-between py-2 text-sm">
						<span>
							{account.name}
							{#if account.orgName}
								<span class="text-xs text-gray-400">{account.orgName}</span>
							{/if}
						</span>
						<span class="text-gray-600">
							{formatCents(Math.abs(account.balanceCents))}
							{#if account.balanceCents < 0}
								<span class="text-xs text-amber-700">owed</span>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="mt-6 rounded-lg border border-gray-200 bg-white p-5">
		<h2 class="font-semibold">Household access</h2>
		{#if data.sharedBy}
			<p class="mt-1 text-sm text-gray-500">
				You have shared access to <strong>{data.sharedBy}</strong>'s bills. Only they can manage who
				has access.
			</p>
		{:else}
			<p class="mt-1 text-sm text-gray-500">
				People listed here see and manage <em>your</em> bills, bank sync, and reminders when they sign
				in with the matching email (any sign-in method).
			</p>

			{#if data.shares.length > 0}
				<ul class="mt-3 space-y-2">
					{#each data.shares as share (share.id)}
						<li class="flex items-center justify-between text-sm">
							<span>{share.email}</span>
							<form method="POST" action="?/removeShare" use:enhance>
								<input type="hidden" name="shareId" value={share.id} />
								<button class="rounded-md px-2 py-1 text-red-600 hover:bg-red-50">Remove</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}

			<form method="POST" action="?/addShare" class="mt-3 flex flex-wrap gap-2" use:enhance>
				<input
					type="email"
					name="email"
					placeholder="partner@example.com"
					class="min-w-64 flex-1 rounded-md border-gray-300 text-sm"
				/>
				<button
					class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
				>
					Share access
				</button>
			</form>
			{#if form?.intent === 'share' && form?.error}
				<p class="mt-2 text-sm text-red-600">{form.error}</p>
			{/if}
		{/if}
	</div>
</div>
