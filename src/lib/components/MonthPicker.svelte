<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatMonth, nextMonth, previousMonth } from '$lib/domain/month';

	let { month, months }: { month: string; months: string[] } = $props();

	const options = $derived(months.includes(month) ? months : [month, ...months]);

	const monthHref = (m: string) => resolve('/bills/[month]', { month: m });
</script>

<div class="flex items-center gap-2">
	<a
		href={monthHref(previousMonth(month))}
		class="rounded-md border border-gray-300 px-2 py-1.5 text-sm hover:bg-gray-100"
		aria-label="Previous month"
	>
		&larr;
	</a>
	<select
		class="rounded-md border-gray-300 text-sm"
		value={month}
		onchange={(e) => goto(monthHref(e.currentTarget.value))}
	>
		{#each options as m (m)}
			<option value={m}>{formatMonth(m)}</option>
		{/each}
	</select>
	<a
		href={monthHref(nextMonth(month))}
		class="rounded-md border border-gray-300 px-2 py-1.5 text-sm hover:bg-gray-100"
		aria-label="Next month"
	>
		&rarr;
	</a>
</div>
