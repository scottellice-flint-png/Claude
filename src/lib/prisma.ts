// Conditional Prisma client - allows build to succeed without generated client
let PrismaClient: any;
let prisma: any;

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
  console.warn('Prisma client not available - admin features will be disabled');
  prisma = null;
}

export { prisma };
export default prisma;
