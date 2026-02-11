import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { transitionMarketStatus } from '@/services/marketService';
import { validateBody, createApprovalSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import type { MarketStatus } from '@/types/admin';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid market ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const approval = validateBody(createApprovalSchema, req.body);
    const market = await transitionMarketStatus(
      id,
      approval.toStatus as MarketStatus,
      approval,
      ctx
    );
    return res.status(200).json(market);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    throw error;
  }
}

export default withAdminAuth(handler, 'market:update');
