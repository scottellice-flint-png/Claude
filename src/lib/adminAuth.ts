import { getServerSession } from 'next-auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from './auth';
import { hasPermission, type AdminRole } from '@/types/admin';

export interface AdminSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    firstName: string;
    lastName: string;
  };
}

export interface AdminContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

// Get admin session from request
export async function getAdminSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AdminSession | null> {
  const session = await getServerSession(req, res, authOptions);
  return session as AdminSession | null;
}

// Extract context from request
export function getAdminContext(
  req: NextApiRequest,
  session: AdminSession
): AdminContext {
  return {
    userId: session.user.id,
    userEmail: session.user.email,
    ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

// Check if user has required permission
export function checkPermission(role: AdminRole, permission: string): boolean {
  return hasPermission(role, permission);
}

// Middleware wrapper for protected admin routes
export function withAdminAuth(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    session: AdminSession,
    ctx: AdminContext
  ) => Promise<void | NextApiResponse>,
  requiredPermission?: string
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await getAdminSession(req, res);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (requiredPermission && !checkPermission(session.user.role, requiredPermission)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      const ctx = getAdminContext(req, session);

      await handler(req, res, session, ctx);
    } catch (error) {
      console.error('Admin API error:', error);

      if (error instanceof Error) {
        // Handle known error types
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Invalid') || error.message.includes('Cannot')) {
          return res.status(400).json({ error: error.message });
        }
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Simplified wrapper for public admin routes (login page, etc.)
export function withPublicAdminRoute(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Public admin API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
