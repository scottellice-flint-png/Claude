// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { createSubcategory, getSubcategoriesByCategory } from '@/services/categoryService';
import { validateBody, createSubcategorySchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    const { categoryId } = req.query;
    if (typeof categoryId !== 'string') {
      return res.status(400).json({ error: 'categoryId is required' });
    }
    const subcategories = await getSubcategoriesByCategory(categoryId);
    return res.status(200).json(subcategories);
  }

  if (req.method === 'POST') {
    try {
      const input = validateBody(createSubcategorySchema, req.body);
      const subcategory = await createSubcategory(input, ctx);
      return res.status(201).json(subcategory);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'category:read');
