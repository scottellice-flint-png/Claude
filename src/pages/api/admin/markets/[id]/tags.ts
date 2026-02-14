// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { updateMarketTags } from '@/services/marketService';
import { z } from 'zod';

const updateTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = updateTagsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation error', details: result.error.issues });
  }

  await updateMarketTags(id, result.data.tagIds, ctx);
  return res.status(200).json({ success: true });
}

export default withAdminAuth(handler, 'market:update');
