import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getTag, updateTag, deleteTag } from '@/services/tagService';
import { validateBody, updateTagSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid tag ID' });
  }

  if (req.method === 'GET') {
    const tag = await getTag(id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    return res.status(200).json(tag);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const input = validateBody(updateTagSchema, req.body);
      const tag = await updateTag(id, input, ctx);
      return res.status(200).json(tag);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    await deleteTag(id, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'tag:read');
