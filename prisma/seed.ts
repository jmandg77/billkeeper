/// <reference types="node" />
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/lib/server/generated/client';
import { ensureDemoUser, resetDemoData } from '../src/lib/server/demo';

const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!email || !password) {
	console.error('Set DEMO_EMAIL and DEMO_PASSWORD in .env to seed the demo user.');
	process.exit(1);
}

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

const userId = await ensureDemoUser(db, { email, password });
await resetDemoData(db, userId);
console.log(`Seeded demo user ${email} with sample bills.`);
await db.$disconnect();
