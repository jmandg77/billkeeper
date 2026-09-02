<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { appName } from '$lib/appName';
	import { authClient } from '$lib/auth-client';

	// The default name keeps its two-tone wordmark; custom names render plain.
	const nameParts =
		appName === 'billkeeper' ? { head: 'bill', tail: 'keeper' } : { head: appName, tail: '' };

	let { data, children } = $props();

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto(resolve('/'));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<a
				href={data.user ? resolve('/bills') : resolve('/')}
				class="text-xl font-bold tracking-tight"
			>
				{nameParts.head}<span class="text-indigo-600">{nameParts.tail}</span>
			</a>
			{#if data.user}
				<div class="flex items-center gap-4">
					{#if data.isDemo}
						<span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
							Demo — data resets on each demo sign-in
						</span>
					{/if}
					{#if !data.isDemo}
						<a href={resolve('/settings')} class="text-sm text-gray-600 hover:text-indigo-600">
							Settings
						</a>
					{/if}
					{#if data.sharedBy}
						<span
							class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700"
							title="You have shared access to this household's bills"
						>
							{data.sharedBy}'s bills
						</span>
					{/if}
					<span class="hidden text-sm text-gray-600 sm:inline">{data.user.name}</span>
					<button
						onclick={signOut}
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
					>
						Sign out
					</button>
				</div>
			{/if}
		</div>
	</header>
	<main class="mx-auto max-w-6xl px-6 py-8">
		{@render children()}
	</main>
</div>
