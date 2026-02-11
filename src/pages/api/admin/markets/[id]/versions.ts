import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import { getMarketVersions, rollbackMarket } from '@/services/marketService';

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

  if (req.method === 'GET') {
    const versions = await getMarketVersions(id);
    return res.status(200).json(versions);
  }

  if (req.method === 'POST') {
    // Rollback to a specific version
    const { versionId } = req.body;

    if (typeof versionId !== 'string') {
      return res.status(400).json({ error: 'Version ID is required' });
    }

    const market = await rollbackMarket(id, versionId, ctx);
    return res.status(200).json(market);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'market:read');
