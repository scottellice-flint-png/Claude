// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getMarket, updateMarket, deleteMarket } from '@/services/marketService';
import { validateBody, updateMarketSchema } from '@/lib/validation';
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

  if (req.method === 'GET') {
    const market = await getMarket(id);
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    return res.status(200).json(market);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const input = validateBody(updateMarketSchema, req.body);
      const market = await updateMarket(id, input, ctx);
      return res.status(200).json(market);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    await deleteMarket(id, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'market:read');
