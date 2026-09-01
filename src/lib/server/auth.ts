import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from './db';

type OAuthCredentials = { clientId: string; clientSecret: string };

const socialProviders: Partial<Record<'github' | 'google', OAuthCredentials>> = {};
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
	socialProviders.github = {
		clientId: env.GITHUB_CLIENT_ID,
		clientSecret: env.GITHUB_CLIENT_SECRET
	};
}
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
	socialProviders.google = {
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET
	};
}

export const enabledProviders = Object.keys(socialProviders) as ('github' | 'google')[];

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: 'postgresql' }),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL || env.ORIGIN || undefined,
	// Password sign-in exists only for the shared demo account; there is no signup.
	emailAndPassword: {
		enabled: true,
		disableSignUp: true
	},
	// The same person signing in via GitHub or Google (matching verified email)
	// should land on one user, not two.
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['github', 'google']
		}
	},
	socialProviders,
	plugins: [sveltekitCookies(getRequestEvent)]
});
