// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getCollection, updateCollection, deleteCollection } from '@/services/collectionService';
import { validateBody, updateCollectionSchema } from '@/lib/validation';
import { ZodError } from 'zod';

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

  if (req.method === 'GET') {
    const collection = await getCollection(id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    return res.status(200).json(collection);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const input = validateBody(updateCollectionSchema, req.body);
      const collection = await updateCollection(id, input, ctx);
      return res.status(200).json(collection);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    await deleteCollection(id, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'collection:read');
