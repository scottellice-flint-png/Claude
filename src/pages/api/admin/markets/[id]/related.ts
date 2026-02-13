// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { addRelatedMarket, removeRelatedMarket } from '@/services/marketService';
import { validateBody, createMarketRelationSchema } from '@/lib/validation';
import { ZodError } from 'zod';

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

  if (req.method === 'POST') {
    try {
      const input = validateBody(createMarketRelationSchema, req.body);
      await addRelatedMarket(
        id,
        input.relatedMarketId,
        input.relationType,
        input.displayOrder,
        ctx
      );
      return res.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    const { relatedMarketId } = req.body;

    if (typeof relatedMarketId !== 'string') {
      return res.status(400).json({ error: 'Related market ID is required' });
    }

    await removeRelatedMarket(id, relatedMarketId, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'market:update');
