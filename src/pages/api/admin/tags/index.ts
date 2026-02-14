// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { createTag, getTags, searchTags } from '@/services/tagService';
import { validateBody, createTagSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    const { search } = req.query;
    if (typeof search === 'string' && search.length > 0) {
      const tags = await searchTags(search);
      return res.status(200).json(tags);
    }
    const tags = await getTags();
    return res.status(200).json(tags);
  }

  if (req.method === 'POST') {
    try {
      const input = validateBody(createTagSchema, req.body);
      const tag = await createTag(input, ctx);
      return res.status(201).json(tag);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'tag:read');
