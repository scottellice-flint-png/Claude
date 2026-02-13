// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getAuditLogs, getEntityAuditLogs } from '@/services/auditService';
import { paginationSchema, auditLogFiltersSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import type { EntityType } from '@/types/admin';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { entityType, entityId } = req.query;

    // If both entityType and entityId are provided, get entity-specific logs
    if (typeof entityType === 'string' && typeof entityId === 'string') {
      const logs = await getEntityAuditLogs(entityType as EntityType, entityId);
      return res.status(200).json(logs);
    }

    // Otherwise, get filtered logs with pagination
    const { page, pageSize } = paginationSchema.parse(req.query);
    const filters = auditLogFiltersSchema.parse(req.query);

    const result = await getAuditLogs(filters, page, pageSize);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
    }
    throw error;
  }
}

export default withAdminAuth(handler, 'audit:read');
