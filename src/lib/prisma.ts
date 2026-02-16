// Prisma client singleton for Next.js + Vercel serverless (Prisma 7.x)

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Type declaration for global prisma instance
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  var __prismaInitError: string | undefined;
}

let prisma: PrismaClient | null = null;
let prismaInitError: string | null = global.__prismaInitError || null;

// Lazy initialization - only create client when first accessed
function getPrismaClient(): PrismaClient | null {
  if (prisma) return prisma;
  if (prismaInitError) return null;

  try {
    // Check if already initialized globally (for serverless reuse)
    if (global.__prisma) {
      prisma = global.__prisma;
      return prisma;
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create pg Pool for the adapter
    const pool = new Pool({
      connectionString,
      max: 10, // Connection pool size
    });

    // Create Prisma adapter
    const adapter = new PrismaPg(pool);

    // Create new client with adapter
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Store globally for reuse in serverless
    global.__prisma = prisma;

    console.log('[Prisma] Client initialized successfully');
    return prisma;
  } catch (e) {
    const errorMessage = e instanceof Error
      ? `${e.name}: ${e.message}`
      : String(e);
    console.error('[Prisma] Client initialization failed:', errorMessage);
    prismaInitError = errorMessage;
    global.__prismaInitError = errorMessage;
    return null;
  }
}

// Export a proxy that lazily initializes the client
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    if (!client) {
      throw new Error(`Prisma client not available: ${prismaInitError || 'Unknown error'}`);
    }
    return (client as Record<string | symbol, unknown>)[prop];
  },
});

// Helper to check if prisma is available without throwing
function isPrismaAvailable(): boolean {
  return getPrismaClient() !== null;
}

// Get the initialization error if any
function getInitError(): string | null {
  getPrismaClient(); // Attempt initialization
  return prismaInitError;
}

export { prismaProxy as prisma, prismaInitError, isPrismaAvailable, getInitError };
export default prismaProxy;
