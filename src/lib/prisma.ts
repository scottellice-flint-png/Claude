// Prisma client singleton for Next.js + Vercel serverless

import { PrismaClient } from '@prisma/client';

// Type declaration for global prisma instance
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  var __prismaInitError: string | undefined;
}

let prisma: PrismaClient | null = null;
let prismaInitError: string | null = global.__prismaInitError || null;

// Helper to ensure PgBouncer compatibility by adding required parameters
function getPgBouncerCompatibleUrl(url: string): string {
  const urlObj = new URL(url);

  // Add pgbouncer=true to disable prepared statements (fixes "prepared statement already exists" errors)
  if (!urlObj.searchParams.has('pgbouncer')) {
    urlObj.searchParams.set('pgbouncer', 'true');
  }

  // Ensure connection limit is set for serverless
  if (!urlObj.searchParams.has('connection_limit')) {
    urlObj.searchParams.set('connection_limit', '1');
  }

  return urlObj.toString();
}

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

    // Ensure PgBouncer compatibility
    const compatibleUrl = getPgBouncerCompatibleUrl(connectionString);

    // Create new client with PgBouncer-compatible connection
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: compatibleUrl,
        },
      },
    });

    // Store globally for reuse in serverless (avoid creating multiple connections)
    if (process.env.NODE_ENV !== 'production') {
      global.__prisma = prisma;
    }

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
    return (client as unknown as Record<string | symbol, unknown>)[prop];
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
