import { create } from 'zustand';
import { Market, Order, Position, User, Trade, OrderBook } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data
const mockMarkets: Market[] = [
  {
    id: '1',
    title: 'Will Bitcoin exceed $100,000 by end of 2026?',
    description: 'This market will resolve to Yes if the price of Bitcoin (BTC) exceeds $100,000 USD on any major exchange before December 31, 2026 11:59 PM ET.',
    category: 'crypto',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-02T12:00:00Z',
    yesPrice: 67,
    noPrice: 33,
    volume: 2450000,
    liquidity: 890000,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Will the Federal Reserve cut rates in Q1 2026?',
    description: 'This market resolves to Yes if the Federal Reserve announces a rate cut during Q1 2026 (January 1 - March 31).',
    category: 'economics',
    status: 'open',
    closeDate: '2026-03-31T23:59:00Z',
    settlementDate: '2026-04-01T12:00:00Z',
    yesPrice: 42,
    noPrice: 58,
    volume: 1890000,
    liquidity: 650000,
    createdAt: '2024-02-01T14:30:00Z',
  },
  {
    id: '3',
    title: 'Will AI pass the Turing Test by 2027?',
    description: 'Market resolves Yes if a recognized AI system passes a formal Turing Test administered by a reputable institution before January 1, 2027.',
    category: 'tech',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-05T12:00:00Z',
    yesPrice: 78,
    noPrice: 22,
    volume: 3200000,
    liquidity: 1200000,
    createdAt: '2024-01-20T09:00:00Z',
  },
  {
    id: '4',
    title: 'Will global temperature rise exceed 1.5°C in 2026?',
    description: 'Resolves Yes if the global average temperature for 2026 exceeds 1.5°C above pre-industrial levels according to NOAA.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-02-01T12:00:00Z',
    yesPrice: 55,
    noPrice: 45,
    volume: 890000,
    liquidity: 320000,
    createdAt: '2024-03-01T11:00:00Z',
  },
  {
    id: '5',
    title: 'Will SpaceX land humans on Mars by 2030?',
    description: 'Market resolves Yes if SpaceX successfully lands at least one human on Mars before January 1, 2030.',
    category: 'science',
    status: 'open',
    closeDate: '2029-12-31T23:59:00Z',
    settlementDate: '2030-01-15T12:00:00Z',
    yesPrice: 23,
    noPrice: 77,
    volume: 5600000,
    liquidity: 2100000,
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '6',
    title: 'Will Democrats win the 2028 Presidential Election?',
    description: 'Resolves Yes if the Democratic Party candidate wins the 2028 US Presidential Election.',
    category: 'politics',
    status: 'open',
    closeDate: '2028-11-05T23:59:00Z',
    settlementDate: '2028-11-15T12:00:00Z',
    yesPrice: 48,
    noPrice: 52,
    volume: 12500000,
    liquidity: 4500000,
    createdAt: '2024-02-15T10:00:00Z',
  },
  {
    id: '7',
    title: 'Will the Super Bowl LXII have over 120M viewers?',
    description: 'Market resolves Yes if Super Bowl LXII (2028) has more than 120 million US viewers according to Nielsen ratings.',
    category: 'sports',
    status: 'open',
    closeDate: '2028-02-15T23:59:00Z',
    settlementDate: '2028-02-20T12:00:00Z',
    yesPrice: 61,
    noPrice: 39,
    volume: 780000,
    liquidity: 290000,
    createdAt: '2024-03-10T15:00:00Z',
  },
  {
    id: '8',
    title: 'Will a streaming service win Best Picture at Oscars 2026?',
    description: 'Resolves Yes if a film primarily released on a streaming platform wins Best Picture at the 2026 Academy Awards.',
    category: 'entertainment',
    status: 'open',
    closeDate: '2026-03-01T23:59:00Z',
    settlementDate: '2026-03-05T12:00:00Z',
    yesPrice: 72,
    noPrice: 28,
    volume: 450000,
    liquidity: 180000,
    createdAt: '2024-02-20T12:00:00Z',
  },
];

const mockUser: User = {
  id: 'user-1',
  username: 'trader123',
  email: 'trader@example.com',
  balance: 10000_00, // $10,000 in cents
  createdAt: '2024-01-01T00:00:00Z',
};

const mockPositions: Position[] = [
  {
    id: 'pos-1',
    userId: 'user-1',
    marketId: '1',
    side: 'yes',
    quantity: 100,
    avgPrice: 62,
    currentValue: 6700,
    profit: 500,
  },
  {
    id: 'pos-2',
    userId: 'user-1',
    marketId: '3',
    side: 'yes',
    quantity: 50,
    avgPrice: 70,
    currentValue: 3900,
    profit: 400,
  },
  {
    id: 'pos-3',
    userId: 'user-1',
    marketId: '6',
    side: 'no',
    quantity: 75,
    avgPrice: 50,
    currentValue: 3900,
    profit: 150,
  },
];

interface AppState {
  // Data
  markets: Market[];
  user: User | null;
  orders: Order[];
  positions: Position[];
  trades: Trade[];

  // Actions
  getMarket: (id: string) => Market | undefined;
  getMarketsByCategory: (category: string) => Market[];
  getOrderBook: (marketId: string) => OrderBook;
  getUserPositions: () => Position[];
  getUserOrders: () => Order[];

  // Trading actions
  placeOrder: (
    marketId: string,
    side: 'yes' | 'no',
    type: 'limit' | 'market',
    price: number,
    quantity: number
  ) => { success: boolean; order?: Order; error?: string };
  cancelOrder: (orderId: string) => boolean;

  // User actions
  updateBalance: (amount: number) => void;

  // Market updates (for real-time simulation)
  updateMarketPrice: (marketId: string, yesPrice: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  markets: mockMarkets,
  user: mockUser,
  orders: [],
  positions: mockPositions,
  trades: [],

  getMarket: (id: string) => {
    return get().markets.find(m => m.id === id);
  },

  getMarketsByCategory: (category: string) => {
    if (category === 'all') return get().markets;
    return get().markets.filter(m => m.category === category);
  },

  getOrderBook: (marketId: string) => {
    const orders = get().orders.filter(o => o.marketId === marketId && o.status === 'open');
    const market = get().getMarket(marketId);

    // Generate mock order book based on current price
    const yesPrice = market?.yesPrice || 50;

    const generateOrders = (basePrice: number, isBid: boolean): { price: number; quantity: number; orderCount: number }[] => {
      const result = [];
      for (let i = 0; i < 5; i++) {
        const priceOffset = isBid ? -i * 2 : i * 2;
        const price = Math.max(1, Math.min(99, basePrice + priceOffset));
        result.push({
          price,
          quantity: Math.floor(Math.random() * 500) + 100,
          orderCount: Math.floor(Math.random() * 10) + 1,
        });
      }
      return result;
    };

    return {
      yes: {
        bids: generateOrders(yesPrice - 1, true),
        asks: generateOrders(yesPrice + 1, false),
      },
      no: {
        bids: generateOrders(100 - yesPrice - 1, true),
        asks: generateOrders(100 - yesPrice + 1, false),
      },
    };
  },

  getUserPositions: () => {
    const user = get().user;
    if (!user) return [];
    return get().positions.filter(p => p.userId === user.id);
  },

  getUserOrders: () => {
    const user = get().user;
    if (!user) return [];
    return get().orders.filter(o => o.userId === user.id);
  },

  placeOrder: (marketId, side, type, price, quantity) => {
    const user = get().user;
    if (!user) {
      return { success: false, error: 'Not logged in' };
    }

    const cost = price * quantity;
    if (cost > user.balance) {
      return { success: false, error: 'Insufficient balance' };
    }

    const order: Order = {
      id: uuidv4(),
      marketId,
      userId: user.id,
      side,
      type,
      price,
      quantity,
      filledQuantity: 0,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate instant fill for market orders
    if (type === 'market') {
      order.filledQuantity = quantity;
      order.status = 'filled';

      // Update balance
      set(state => ({
        user: state.user ? { ...state.user, balance: state.user.balance - cost } : null,
      }));

      // Add or update position
      const existingPosition = get().positions.find(
        p => p.marketId === marketId && p.side === side && p.userId === user.id
      );

      if (existingPosition) {
        set(state => ({
          positions: state.positions.map(p =>
            p.id === existingPosition.id
              ? {
                  ...p,
                  quantity: p.quantity + quantity,
                  avgPrice: Math.round((p.avgPrice * p.quantity + price * quantity) / (p.quantity + quantity)),
                  currentValue: (p.quantity + quantity) * price,
                }
              : p
          ),
        }));
      } else {
        const newPosition: Position = {
          id: uuidv4(),
          userId: user.id,
          marketId,
          side,
          quantity,
          avgPrice: price,
          currentValue: quantity * price,
          profit: 0,
        };
        set(state => ({
          positions: [...state.positions, newPosition],
        }));
      }

      // Create trade record
      const trade: Trade = {
        id: uuidv4(),
        marketId,
        buyOrderId: order.id,
        sellOrderId: 'market-maker',
        price,
        quantity,
        timestamp: new Date().toISOString(),
      };

      set(state => ({
        trades: [...state.trades, trade],
      }));
    }

    set(state => ({
      orders: [...state.orders, order],
    }));

    return { success: true, order };
  },

  cancelOrder: (orderId: string) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order || order.status !== 'open') {
      return false;
    }

    set(state => ({
      orders: state.orders.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled' as const, updatedAt: new Date().toISOString() } : o
      ),
    }));

    return true;
  },

  updateBalance: (amount: number) => {
    set(state => ({
      user: state.user ? { ...state.user, balance: state.user.balance + amount } : null,
    }));
  },

  updateMarketPrice: (marketId: string, yesPrice: number) => {
    set(state => ({
      markets: state.markets.map(m =>
        m.id === marketId
          ? { ...m, yesPrice, noPrice: 100 - yesPrice }
          : m
      ),
    }));

    // Update positions for this market
    set(state => ({
      positions: state.positions.map(p => {
        if (p.marketId !== marketId) return p;
        const currentPrice = p.side === 'yes' ? yesPrice : 100 - yesPrice;
        const currentValue = p.quantity * currentPrice;
        const profit = currentValue - (p.quantity * p.avgPrice);
        return { ...p, currentValue, profit };
      }),
    }));
  },
}));
