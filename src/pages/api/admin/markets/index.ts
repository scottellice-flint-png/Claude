// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { createMarket, getMarkets } from '@/services/marketService';
import { validateBody, createMarketSchema, paginationSchema, marketFiltersSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    // List markets with filters and pagination
    try {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const filters = marketFiltersSchema.parse(req.query);

      const result = await getMarkets(filters, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'POST') {
    // Create new market
    try {
      const input = validateBody(createMarketSchema, req.body);
      const market = await createMarket(input, ctx);
      return res.status(201).json(market);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'market:read');
