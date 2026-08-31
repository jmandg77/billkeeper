import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { auth, enabledProviders } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { ensureDemoUser, resetDemoData } from '$lib/server/demo';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(302, '/bills');
	return {
		providers: enabledProviders,
		demoEnabled: Boolean(env.DEMO_EMAIL && env.DEMO_PASSWORD)
	};
};

export const actions: Actions = {
	demo: async () => {
		const email = env.DEMO_EMAIL;
		const password = env.DEMO_PASSWORD;
		if (!email || !password) redirect(302, '/');

		const userId = await ensureDemoUser(db, { email, password });
		await resetDemoData(db, userId);
		await auth.api.signInEmail({ body: { email, password } });
		redirect(302, '/bills');
	}
};
