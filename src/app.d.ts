// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				name: string;
				email: string;
				image?: string | null;
			} | null;
			// The user whose data this session operates on: the signed-in user,
			// or the household owner who shared access with them.
			dataUserId: string | null;
			sharedBy: string | null;
		}
	}
}

export {};
