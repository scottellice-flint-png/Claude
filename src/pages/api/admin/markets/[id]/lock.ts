// ============================================================================
// ADMIN MARKET LOCK API
// POST/DELETE /api/admin/markets/[id]/lock
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  triggerOracleLock,
  releaseOracleLock,
  getOracleLockState,
  type OracleLockResult,
  type OracleLockState,
} from '@/services/oracleLockService';
import { writeAuditEvent } from '@/services/auditEventService';

interface LockRequest {
  reason: string;
  cancelMmOrders?: boolean;
  cancelAllOrders?: boolean;
}

interface ApiResponse {
  success: boolean;
  result?: OracleLockResult;
  state?: OracleLockState | null;
  error?: string;
}

// Admin authentication middleware (simplified)
async function getAdminUser(req: NextApiRequest): Promise<{ id: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  // In production, validate JWT and check admin role
  // For now, return mock admin
  const token = authHeader.substring(7);
  if (!token) return null;

  // TODO: Implement proper admin auth
  return { id: 'admin-user-id' };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id: marketId } = req.query;

  if (!marketId || typeof marketId !== 'string') {
    return res.status(400).json({ success: false, error: 'Market ID required' });
  }

  // Verify admin authentication
  const admin = await getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET': {
        // Get current lock state
        const state = await getOracleLockState(marketId);
        return res.status(200).json({ success: true, state });
      }

      case 'POST': {
        // Lock the market
        const body = req.body as LockRequest;

        if (!body.reason) {
          return res.status(400).json({ success: false, error: 'Reason required' });
        }

        const result = await triggerOracleLock(
          marketId,
          'MANUAL_LOCK',
          `admin:${admin.id}`,
          {
            cancelMmOrders: body.cancelMmOrders ?? true,
            cancelAllResting: body.cancelAllOrders ?? false,
            metadata: { adminId: admin.id, reason: body.reason },
          }
        );

        await writeAuditEvent({
          eventType: 'ADMIN_MARKET_SUSPENDED',
          actorType: 'admin',
          actorId: admin.id,
          marketId,
          reasonCode: body.reason,
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
        });

        return res.status(200).json({ success: result.success, result });
      }

      case 'DELETE': {
        // Unlock the market
        const body = req.body as { reason?: string };

        const result = await releaseOracleLock(
          marketId,
          admin.id,
          body.reason || 'Admin unlock'
        );

        await writeAuditEvent({
          eventType: 'ADMIN_MARKET_REOPENED',
          actorType: 'admin',
          actorId: admin.id,
          marketId,
          reasonCode: 'MANUAL_UNLOCK',
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
        });

        return res.status(200).json({ success: result.success, result });
      }

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin lock handler error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal error',
    });
  }
}
