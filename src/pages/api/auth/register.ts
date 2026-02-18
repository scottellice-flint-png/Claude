import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '@/services/userService';
import { isPrismaAvailable, getInitError } from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check database connection first
  if (!isPrismaAvailable()) {
    const initError = getInitError();
    console.error('Database not available:', initError);
    return res.status(503).json({
      error: 'Database connection unavailable. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? initError : undefined
    });
  }

  try {
    // Validate request body
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(e => e.message);
      return res.status(400).json({ error: errors[0], errors });
    }

    const { email, username, password, firstName, lastName } = validationResult.data;

    // Create user
    const result = await createUser({
      email,
      username,
      password,
      firstName,
      lastName,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        username: result.user!.username,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return res.status(503).json({ error: 'Database connection failed. Please try again later.' });
      }
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        return res.status(503).json({ error: 'Database setup incomplete. Please contact support.' });
      }
    }

    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}
