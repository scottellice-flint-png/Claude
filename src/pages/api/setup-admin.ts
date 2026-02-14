import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

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

  try {
    const email = 'admin@foremark.com';
    const password = 'admin123';
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
        password,
        note: 'DELETE THIS ENDPOINT AFTER USE: src/pages/api/setup-admin.ts',
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
      password,
      id: admin.id,
      note: 'DELETE THIS ENDPOINT AFTER USE: src/pages/api/setup-admin.ts',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
