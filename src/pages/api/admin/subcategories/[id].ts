// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getSubcategory, updateSubcategory, deleteSubcategory } from '@/services/categoryService';
import { validateBody, updateSubcategorySchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid subcategory ID' });
  }

  if (req.method === 'GET') {
    const subcategory = await getSubcategory(id);
    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    return res.status(200).json(subcategory);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const input = validateBody(updateSubcategorySchema, req.body);
      const subcategory = await updateSubcategory(id, input, ctx);
      return res.status(200).json(subcategory);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    await deleteSubcategory(id, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'category:read');
