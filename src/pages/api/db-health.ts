import type { NextApiRequest, NextApiResponse } from 'next';
import { isPrismaAvailable, getInitError, prisma } from '@/lib/prisma';

// Database health check endpoint - helps diagnose connection issues
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {},
  };

  // Check 1: Is DATABASE_URL set?
  const databaseUrlSet = !!process.env.DATABASE_URL;
  const databaseUrlLength = process.env.DATABASE_URL?.length || 0;
  (diagnostics.checks as Record<string, unknown>).DATABASE_URL_SET = {
    status: databaseUrlSet ? 'OK' : 'MISSING',
    message: databaseUrlSet
      ? `DATABASE_URL environment variable is configured (${databaseUrlLength} chars)`
      : 'DATABASE_URL environment variable is NOT set. Add it in Vercel Dashboard > Settings > Environment Variables',
  };

  // Check 2: Is NEXTAUTH_SECRET set?
  const nextAuthSecretSet = !!process.env.NEXTAUTH_SECRET;
  (diagnostics.checks as Record<string, unknown>).NEXTAUTH_SECRET_SET = {
    status: nextAuthSecretSet ? 'OK' : 'MISSING',
    message: nextAuthSecretSet
      ? 'NEXTAUTH_SECRET is configured'
      : 'NEXTAUTH_SECRET is NOT set. Add it in Vercel Dashboard > Settings > Environment Variables',
  };

  // Check 3: Is Prisma client available?
  const prismaAvailable = isPrismaAvailable();
  const initError = getInitError();
  (diagnostics.checks as Record<string, unknown>).PRISMA_CLIENT = {
    status: prismaAvailable ? 'OK' : 'FAILED',
    message: prismaAvailable
      ? 'Prisma client initialized successfully'
      : `Prisma client failed to initialize: ${initError || 'Unknown error'}`,
    ...(initError && { error: initError }),
  };

  // Check 4: Can we connect to the database?
  if (prismaAvailable) {
    try {
      // Try a simple query to test connection
      await prisma.$queryRaw`SELECT 1 as test`;
      (diagnostics.checks as Record<string, unknown>).DATABASE_CONNECTION = {
        status: 'OK',
        message: 'Successfully connected to database',
      };

      // Check 5: Do tables exist?
      try {
        const adminCount = await prisma.adminUser.count();
        (diagnostics.checks as Record<string, unknown>).ADMIN_TABLE = {
          status: 'OK',
          message: `AdminUser table exists with ${adminCount} record(s)`,
          adminCount,
        };
      } catch (tableError) {
        const errorMsg = tableError instanceof Error ? tableError.message : 'Unknown error';
        (diagnostics.checks as Record<string, unknown>).ADMIN_TABLE = {
          status: 'FAILED',
          message: 'AdminUser table does not exist or is not accessible',
          error: errorMsg,
          fix: 'Run database migrations: npx prisma db push',
        };
      }
    } catch (connectionError) {
      const errorMsg = connectionError instanceof Error ? connectionError.message : 'Unknown error';
      (diagnostics.checks as Record<string, unknown>).DATABASE_CONNECTION = {
        status: 'FAILED',
        message: 'Cannot connect to database',
        error: errorMsg,
        possibleFixes: [
          'Check that DATABASE_URL is correct',
          'Ensure the database server is running and accessible',
          'Check firewall/network settings allow connection from Vercel',
          'Verify SSL settings in connection string (?sslmode=require)',
        ],
      };
    }
  } else {
    (diagnostics.checks as Record<string, unknown>).DATABASE_CONNECTION = {
      status: 'SKIPPED',
      message: 'Skipped - Prisma client not available',
    };
  }

  // Determine overall status
  const checks = diagnostics.checks as Record<string, { status: string }>;
  const allOk = Object.values(checks).every((check) => check.status === 'OK');
  const hasFailed = Object.values(checks).some((check) => check.status === 'FAILED' || check.status === 'MISSING');

  diagnostics.overallStatus = allOk ? 'HEALTHY' : hasFailed ? 'UNHEALTHY' : 'DEGRADED';

  // Add summary of what needs to be fixed
  if (!allOk) {
    const issues: string[] = [];
    if (!databaseUrlSet) {
      issues.push('Add DATABASE_URL to Vercel environment variables');
    }
    if (!nextAuthSecretSet) {
      issues.push('Add NEXTAUTH_SECRET to Vercel environment variables');
    }
    if (!prismaAvailable) {
      issues.push('Fix Prisma client initialization (usually DATABASE_URL issue)');
    }
    const adminTable = checks.ADMIN_TABLE;
    if (adminTable && adminTable.status === 'FAILED') {
      issues.push('Run database migrations: npx prisma db push');
    }
    diagnostics.requiredActions = issues;
  }

  const statusCode = allOk ? 200 : hasFailed ? 500 : 200;
  return res.status(statusCode).json(diagnostics);
}
