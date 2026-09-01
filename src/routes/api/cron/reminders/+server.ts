import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { sendDueReminders } from '$lib/server/notify';
import type { RequestHandler } from './$types';

// Invoked daily by Vercel Cron (see vercel.json); Vercel sends
// "Authorization: Bearer $CRON_SECRET" automatically.
export const GET: RequestHandler = async ({ request }) => {
	if (env.CRON_SECRET) {
		if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
			error(401, 'Unauthorized');
		}
	} else if (!dev) {
		error(503, 'CRON_SECRET is not configured');
	}
	return json(await sendDueReminders());
};
