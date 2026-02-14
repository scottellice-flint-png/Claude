// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import {
  addMarketToCollection,
  removeMarketFromCollection,
  reorderCollectionMarkets,
  setCollectionMarkets,
} from '@/services/collectionService';
import { z } from 'zod';

const addMarketSchema = z.object({
  marketId: z.string().uuid(),
  displayOrder: z.number().min(0).optional(),
});

const removeMarketSchema = z.object({
  marketId: z.string().uuid(),
});

const reorderSchema = z.object({
  marketIds: z.array(z.string().uuid()),
});

const setMarketsSchema = z.object({
  marketIds: z.array(z.string().uuid()),
});

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid collection ID' });
  }

  if (req.method === 'POST') {
    // Add market to collection
    const result = addMarketSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation error', details: result.error.issues });
    }

    await addMarketToCollection(id, result.data.marketId, result.data.displayOrder, ctx);
    return res.status(201).json({ success: true });
  }

  if (req.method === 'PUT') {
    // Set or reorder markets
    const { action } = req.query;

    if (action === 'reorder') {
      const result = reorderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Validation error', details: result.error.issues });
      }
      await reorderCollectionMarkets(id, result.data.marketIds, ctx);
      return res.status(200).json({ success: true });
    }

    // Default: set all markets
    const result = setMarketsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation error', details: result.error.issues });
    }
    await setCollectionMarkets(id, result.data.marketIds, ctx);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const result = removeMarketSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation error', details: result.error.issues });
    }

    await removeMarketFromCollection(id, result.data.marketId, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'collection:manage');
