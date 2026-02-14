// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import {
  getAdminUser,
  updateAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
} from '@/services/adminUserService';
import { validateBody, updateAdminUserSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id, action } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'GET') {
    const user = await getAdminUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    // Check permissions for editing users
    if (!['super_admin', 'admin'].includes(session.user.role) && id !== session.user.id) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    try {
      const input = validateBody(updateAdminUserSchema, req.body);

      // Prevent changing role unless you're admin
      if (input.role && !['super_admin', 'admin'].includes(session.user.role)) {
        return res.status(403).json({ error: 'Only admins can change user roles' });
      }

      // Prevent changing to super_admin unless you're super_admin
      if (input.role === 'super_admin' && session.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only super_admin can assign super_admin role' });
      }

      const user = await updateAdminUser(id, input, ctx);
      return res.status(200).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'POST') {
    // Handle special actions
    if (action === 'deactivate') {
      const user = await deactivateAdminUser(id, ctx);
      return res.status(200).json(user);
    }

    if (action === 'reactivate') {
      const user = await reactivateAdminUser(id, ctx);
      return res.status(200).json(user);
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'user:read');
