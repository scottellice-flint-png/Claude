import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { settleMarket } from '@/services/marketService';

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

  const market = await settleMarket(id, ctx);
  return res.status(200).json(market);
}

export default withAdminAuth(handler, 'market:settle');
