import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getCategory, updateCategory, deleteCategory } from '@/services/categoryService';
import { validateBody, updateCategorySchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  if (req.method === 'GET') {
    const category = await getCategory(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.status(200).json(category);
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const input = validateBody(updateCategorySchema, req.body);
      const category = await updateCategory(id, input, ctx);
      return res.status(200).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  }

  if (req.method === 'DELETE') {
    await deleteCategory(id, ctx);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'category:read');
