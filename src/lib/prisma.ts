// Prisma client singleton for Next.js + Vercel serverless

// Type declaration for global prisma instance
declare global {
  // eslint-disable-next-line no-var
  var __prisma: InstanceType<typeof import('@prisma/client').PrismaClient> | undefined;
  var __prismaInitError: string | undefined;
}

let prisma: InstanceType<typeof import('@prisma/client').PrismaClient> | null = null;
let prismaInitError: string | null = global.__prismaInitError || null;

// Lazy initialization - only create client when first accessed
function getPrismaClient() {
  if (prisma) return prisma;
  if (prismaInitError) return null;

  try {
    // Dynamic import to handle missing client gracefully
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client');

    // Check if already initialized globally (for serverless reuse)
    if (global.__prisma) {
      prisma = global.__prisma;
      return prisma;
    }

    // Create new client
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // Connection pool settings for serverless
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
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
const prismaProxy = new Proxy({} as NonNullable<typeof prisma>, {
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
