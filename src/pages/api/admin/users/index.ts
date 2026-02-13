// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { createAdminUser, getAdminUsers } from '@/services/adminUserService';
import { validateBody, createAdminUserSchema, paginationSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    try {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const includeInactive = req.query.includeInactive === 'true';
      const result = await getAdminUsers(page, pageSize, includeInactive);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'POST') {
    // Only super_admin and admin can create users
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    try {
      const input = validateBody(createAdminUserSchema, req.body);

      // Prevent creating super_admin unless you're a super_admin
      if (input.role === 'super_admin' && session.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only super_admin can create super_admin users' });
      }

      const user = await createAdminUser(input, ctx);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'user:read');
