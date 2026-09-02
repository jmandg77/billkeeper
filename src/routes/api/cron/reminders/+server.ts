import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { syncAllConnections } from '$lib/server/banksync/sync';
import { sendDueReminders } from '$lib/server/notify';
import type { RequestHandler } from './$types';

// Invoked daily by Vercel Cron (see vercel.json); Vercel sends
// "Authorization: Bearer $CRON_SECRET" automatically.
// Bank sync runs first so a bill the bank already shows as paid
// doesn't get a reminder minutes later.
export const GET: RequestHandler = async ({ request }) => {
	if (env.CRON_SECRET) {
		if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
			error(401, 'Unauthorized');
		}
	} else if (!dev) {
		error(503, 'CRON_SECRET is not configured');
	}
	const sync = await syncAllConnections(new Date().toISOString().slice(0, 7));
	const reminders = await sendDueReminders();
	return json({ sync, reminders });
};
