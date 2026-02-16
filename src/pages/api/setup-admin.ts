import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import prisma, { prismaInitError } from '@/lib/prisma';

// ONE-TIME SETUP ENDPOINT - DELETE AFTER USE
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for easy browser access
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security: Check for setup key
  const setupKey = req.query.key;
  if (setupKey !== 'foremark-setup-2024') {
    return res.status(403).json({ error: 'Invalid setup key' });
  }

  // Check if Prisma client is available
  if (!prisma) {
    return res.status(500).json({
      error: 'Database client not available',
      details: 'Prisma client failed to initialize.',
      initError: prismaInitError || 'Unknown error',
      diagnostics: {
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        DATABASE_URL_PREVIEW: process.env.DATABASE_URL
          ? process.env.DATABASE_URL.substring(0, 30) + '...'
          : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
      },
      possibleCauses: [
        '1. DATABASE_URL environment variable is not set in Vercel',
        '2. Prisma client was not generated during build',
        '3. Database connection failed',
      ],
      fix: 'Go to Vercel Dashboard > Project Settings > Environment Variables and add DATABASE_URL with your PostgreSQL connection string',
    });
  }

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'DATABASE_URL not configured',
      fix: 'Add DATABASE_URL environment variable in Vercel with your PostgreSQL connection string',
    });
  }

  try {
    // Use environment variables for admin credentials
    const emailFromEnv = !!process.env.ADMIN_INITIAL_EMAIL;
    const passwordFromEnv = !!process.env.ADMIN_INITIAL_PASSWORD;
    const email = process.env.ADMIN_INITIAL_EMAIL || 'admin@foremark.com';
    const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if admin exists
    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      // Update password
      await prisma.adminUser.update({
        where: { email },
        data: { passwordHash, isActive: true },
      });

      return res.status(200).json({
        message: 'Admin password has been reset',
        email,
        credentialsSource: {
          email: emailFromEnv ? 'ADMIN_INITIAL_EMAIL env var' : 'default (admin@foremark.com)',
          password: passwordFromEnv ? 'ADMIN_INITIAL_PASSWORD env var' : 'default (admin123)',
        },
        note: 'You can now login at /admin with these credentials',
      });
    }

    // Create new admin
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'super_admin',
        isActive: true,
      },
    });

    return res.status(201).json({
      message: 'Admin user created successfully',
      email,
      id: admin.id,
      credentialsSource: {
        email: emailFromEnv ? 'ADMIN_INITIAL_EMAIL env var' : 'default (admin@foremark.com)',
        password: passwordFromEnv ? 'ADMIN_INITIAL_PASSWORD env var' : 'default (admin123)',
      },
      note: 'You can now login at /admin with these credentials',
    });
  } catch (error) {
    console.error('Setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide helpful diagnostics based on error type
    let diagnosis = '';
    if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      diagnosis = 'Database tables do not exist. You need to run migrations: npx prisma db push';
    } else if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED')) {
      diagnosis = 'Cannot connect to database. Check that DATABASE_URL is correct and the database is accessible.';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
      diagnosis = 'Database authentication failed. Check your DATABASE_URL credentials.';
    }

    return res.status(500).json({
      error: 'Setup failed',
      details: errorMessage,
      diagnosis: diagnosis || 'Check Vercel logs for more details',
      databaseUrlSet: !!process.env.DATABASE_URL,
    });
  }
}
