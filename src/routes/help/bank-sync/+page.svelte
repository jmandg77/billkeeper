<script lang="ts">
	import { resolve } from '$app/paths';
	import { appName } from '$lib/appName';
</script>

<svelte:head><title>Bank sync setup — {appName}</title></svelte:head>

<div class="mx-auto max-w-xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Setting up bank sync</h1>
		<a href={resolve('/bills')} class="text-sm text-indigo-600 underline">Back to bills</a>
	</div>

	<div class="space-y-4 rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">
		<p>
			Bank sync connects {appName} to your bank <strong>read-only</strong> through
			<a
				href="https://beta-bridge.simplefin.org"
				target="_blank"
				rel="noopener noreferrer"
				class="text-indigo-600 underline">SimpleFIN Bridge</a
			>
			($1.50/mo, paid by you to SimpleFIN). Once connected, syncing marks bills paid when it spots the
			matching payment in your account, keeps every account balance current, and can show a card's live
			balance under its bill. {appName} never sees your bank password, can never move money, and you can
			revoke access from the bridge at any time.
		</p>

		<ol class="list-decimal space-y-3 pl-5">
			<li>
				Create an account at
				<a
					href="https://beta-bridge.simplefin.org"
					target="_blank"
					rel="noopener noreferrer"
					class="text-indigo-600 underline">beta-bridge.simplefin.org</a
				> and subscribe ($1.50/mo).
			</li>
			<li>
				On the bridge, <strong>connect your bank(s)</strong> — the login happens with the bridge's
				aggregator, not with {appName}. Connect whichever accounts you want visible: your
				bill-paying checking account at minimum; credit cards too if you want their balances shown
				on bills.
			</li>
			<li>
				Still on the bridge, choose <strong>New app connection</strong> and copy the
				<strong>setup token</strong> it shows. The token is single-use — if it's lost or rejected, just
				generate another.
			</li>
			<li>
				Back in {appName}, open
				<a href={resolve('/settings')} class="text-indigo-600 underline">Settings</a> →
				<strong>Bank sync</strong> → <strong>Connect bank</strong> and paste the token.
			</li>
			<li>
				Use the <strong>change</strong> link on that card to pick which account your bill payments
				come out of — payment detection reads only that account. Then hit
				<strong>Sync now</strong> (or <strong>Sync linked accounts</strong> on the bills page) whenever
				you want fresh balances and payment matching.
			</li>
		</ol>

		<p class="text-gray-500">
			Good to know: SimpleFIN emails you when a new location reads your data — expect one the first
			time {appName} syncs. Sync only reads transactions and balances; marking bills paid in
			{appName} never touches your bank.
		</p>
	</div>
</div>
