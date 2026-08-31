import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		event.locals.user = null;
		return resolve(event);
	}

	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};
