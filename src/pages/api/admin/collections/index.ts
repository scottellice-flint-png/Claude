import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { createCollection, getCollections, getFeaturedCollections } from '@/services/collectionService';
import { validateBody, createCollectionSchema, paginationSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    const { featured } = req.query;

    if (featured === 'true') {
      const collections = await getFeaturedCollections();
      return res.status(200).json(collections);
    }

    try {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const includeInactive = req.query.includeInactive === 'true';
      const result = await getCollections(includeInactive, page, pageSize);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      throw error;
    }
  }

  if (req.method === 'POST') {
    try {
      const input = validateBody(createCollectionSchema, req.body);
      const collection = await createCollection(input, ctx);
      return res.status(201).json(collection);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'collection:read');
