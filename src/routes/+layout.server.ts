import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user,
		sharedBy: locals.sharedBy,
		isDemo: locals.user !== null && locals.user.email === env.DEMO_EMAIL
	};
};
