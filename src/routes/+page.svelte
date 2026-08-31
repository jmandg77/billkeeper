<script lang="ts">
	import { enhance } from '$app/forms';
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	function signInWith(provider: 'github' | 'google') {
		authClient.signIn.social({ provider, callbackURL: '/bills' });
	}
</script>

<div class="mx-auto max-w-md pt-16 text-center">
	<h1 class="text-4xl font-bold tracking-tight">Keep every bill paid.</h1>
	<p class="mt-4 text-gray-600">
		Track monthly bills, mark them paid, jump straight to each biller's payment page, and see what's
		left of your balance.
	</p>

	<div class="mt-10 flex flex-col gap-3">
		{#if data.providers.includes('github')}
			<button
				onclick={() => signInWith('github')}
				class="rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800"
			>
				Continue with GitHub
			</button>
		{/if}
		{#if data.providers.includes('google')}
			<button
				onclick={() => signInWith('google')}
				class="rounded-md border border-gray-300 bg-white px-4 py-2.5 font-medium hover:bg-gray-100"
			>
				Continue with Google
			</button>
		{/if}
		{#if data.providers.length === 0}
			<p class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
				No OAuth provider is configured. Set GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (or the Google
				equivalents) to enable sign-in.
			</p>
		{/if}
		{#if data.demoEnabled}
			<form method="POST" action="?/demo" use:enhance>
				<button
					class="w-full rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 font-medium text-indigo-700 hover:bg-indigo-100"
				>
					Try the demo
				</button>
			</form>
		{/if}
	</div>
</div>
