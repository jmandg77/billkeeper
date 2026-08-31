import { redirect } from '@sveltejs/kit';
import { currentMonth } from '$lib/domain/month';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(302, '/');
	redirect(302, `/bills/${currentMonth()}`);
};
