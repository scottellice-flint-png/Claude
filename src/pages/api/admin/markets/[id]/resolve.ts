import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { resolveMarket } from '@/services/marketService';
import { validateBody, createResolutionSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid market ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolution = validateBody(createResolutionSchema, req.body);
    const market = await resolveMarket(id, resolution, ctx);
    return res.status(200).json(market);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    throw error;
  }
}

export default withAdminAuth(handler, 'market:resolve');
