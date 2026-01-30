export type MarketCategory =
  | 'politics'
  | 'economics'
  | 'climate'
  | 'sports'
  | 'culture';

export type MarketStatus = 'open' | 'closed' | 'settled';

export type OrderSide = 'yes' | 'no';
export type OrderType = 'limit' | 'market';
export type OrderStatus = 'open' | 'filled' | 'partial' | 'cancelled';

export interface Market {
  id: string;
  title: string;
  description: string;
  category: MarketCategory;
  status: MarketStatus;
  closeDate: string;
  settlementDate: string;
  yesPrice: number; // 0-100 (cents)
  noPrice: number; // 0-100 (cents)
  volume: number;
  liquidity: number;
  createdAt: string;
  imageUrl?: string;
  resolution?: 'yes' | 'no' | null;
}

export interface Order {
  id: string;
  marketId: string;
  userId: string;
  side: OrderSide;
  type: OrderType;
  price: number; // 0-100 (cents)
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  side: OrderSide;
  quantity: number;
  avgPrice: number;
  currentValue: number;
  profit: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number; // in cents
  createdAt: string;
}

export interface Trade {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  price: number;
  quantity: number;
  timestamp: string;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBook {
  yes: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  };
  no: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  };
}

export interface MarketStats {
  high24h: number;
  low24h: number;
  volume24h: number;
  priceChange24h: number;
  trades24h: number;
}

export interface PriceHistory {
  timestamp: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  marketId: string;
  content: string;
  position?: {
    side: 'yes' | 'no';
    marketTitle?: string;
  };
  likes: number;
  replies: Comment[];
  createdAt: string;
}

export interface MarketRules {
  summary: string;
  resolutionSource: string;
  resolutionDetails: string;
  timeline: {
    tradingCloses: string;
    resolutionExpected: string;
  };
  prohibitions: string[];
}
