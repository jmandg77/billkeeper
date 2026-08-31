import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '$env/dynamic/private';
import { PrismaClient } from './generated/client';

// Reuse one client across dev HMR reloads to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

globalForPrisma.prisma = db;
