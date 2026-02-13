// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { createCategory, getCategories } from '@/services/categoryService';
import { validateBody, createCategorySchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await getCategories(includeInactive);
    return res.status(200).json(categories);
  }

  if (req.method === 'POST') {
    try {
      const input = validateBody(createCategorySchema, req.body);
      const category = await createCategory(input, ctx);
      return res.status(201).json(category);
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
