import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		event.locals.user = null;
		event.locals.dataUserId = null;
		event.locals.sharedBy = null;
		return resolve(event);
	}

	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.dataUserId = session?.user?.id ?? null;
	event.locals.sharedBy = null;

	if (session?.user) {
		const share = await db.accountShare.findUnique({
			where: { email: session.user.email },
			include: { owner: { select: { id: true, name: true } } }
		});
		if (share && share.ownerId !== session.user.id) {
			event.locals.dataUserId = share.ownerId;
			event.locals.sharedBy = share.owner.name;
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
