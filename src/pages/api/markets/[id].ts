import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // In production, fetch from database
    return res.status(200).json({ id, message: 'Market details' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
