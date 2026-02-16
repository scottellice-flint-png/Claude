// Conditional Prisma client - allows build to succeed without generated client
let PrismaClient: any;
let prisma: any;
let prismaInitError: string | null = null;

try {
  // Try to import the generated Prisma client
  const prismaModule = require('@prisma/client');
  PrismaClient = prismaModule.PrismaClient;

  // Prevent multiple instances during development hot reloading
  const globalForPrisma = globalThis as unknown as {
    prisma: typeof prisma | undefined;
  };

  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} catch (e) {
  // Prisma client not generated - create a stub for build time
  const errorMessage = e instanceof Error ? e.message : String(e);
  console.error('Prisma client initialization failed:', errorMessage);
  prismaInitError = errorMessage;
  prisma = null;
}

export { prisma, prismaInitError };
export default prisma;
