import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { marketId, side, type, price, quantity } = req.body;

    // Validate input
    if (!marketId || !side || !type || !price || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In production, process order and match with order book
    const order = {
      id: `order-${Date.now()}`,
      marketId,
      side,
      type,
      price,
      quantity,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json(order);
  }

  if (req.method === 'GET') {
    // Return user's orders
    return res.status(200).json([]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
