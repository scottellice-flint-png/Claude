import { create } from 'zustand';
import { Market, Order, Position, User, Trade, OrderBook } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data - Australian-focused markets
const mockMarkets: Market[] = [
  // Politics
  {
    id: '1',
    title: 'Who will win the next Australian Federal Election?',
    description: 'This market resolves to Yes if the Australian Labor Party wins the next Federal Election. Resolves No if the Liberal-National Coalition wins.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-05-25T12:00:00+10:00',
    yesPrice: 52,
    noPrice: 48,
    volume: 8750000,
    liquidity: 2890000,
    createdAt: '2025-01-15T10:00:00+10:00',
  },
  {
    id: '2',
    title: 'Will a Federal Election be called before September 2026?',
    description: 'Resolves Yes if the Governor-General dissolves the House of Representatives and issues writs for a federal election before September 1, 2026.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-08-31T23:59:00+10:00',
    settlementDate: '2026-09-02T12:00:00+10:00',
    yesPrice: 78,
    noPrice: 22,
    volume: 3420000,
    liquidity: 1250000,
    createdAt: '2025-02-01T14:30:00+10:00',
  },
  {
    id: '3',
    title: 'Will the Federal Government amend Stage 3 tax cuts before the 2026 Budget?',
    description: 'Resolves Yes if the Australian Federal Government passes legislation amending the Stage 3 tax cuts before the 2026-27 Federal Budget is handed down.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-01T23:59:00+10:00',
    settlementDate: '2026-05-15T12:00:00+10:00',
    yesPrice: 35,
    noPrice: 65,
    volume: 1890000,
    liquidity: 650000,
    createdAt: '2025-01-20T09:00:00+10:00',
  },
  // Sports
  {
    id: '4',
    title: 'Winner of Djokovic vs Sinner - Australian Open 2026 Final?',
    description: "Resolves Yes if Novak Djokovic wins the Australian Open 2026 Men's Singles Final against Jannik Sinner. Resolves No if Sinner wins.",
    category: 'sports',
    status: 'open',
    closeDate: '2026-01-26T19:00:00+11:00',
    settlementDate: '2026-01-27T12:00:00+11:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 4560000,
    liquidity: 1780000,
    createdAt: '2025-01-10T08:00:00+11:00',
  },
  {
    id: '5',
    title: "Will Tasmania be awarded the AFL's 19th licence by 2027?",
    description: 'Resolves Yes if the AFL officially announces Tasmania as the 19th AFL team before January 1, 2027.',
    category: 'sports',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+11:00',
    settlementDate: '2027-01-05T12:00:00+11:00',
    yesPrice: 89,
    noPrice: 11,
    volume: 2340000,
    liquidity: 890000,
    createdAt: '2025-02-15T10:00:00+11:00',
  },
  {
    id: '6',
    title: 'Will the NRL Grand Final be played outside Sydney in 2026?',
    description: 'Resolves Yes if the 2026 NRL Grand Final is held at a venue outside of Sydney. Accredited Stadium (Sydney) resolves No.',
    category: 'sports',
    status: 'open',
    closeDate: '2026-10-01T23:59:00+10:00',
    settlementDate: '2026-10-05T12:00:00+10:00',
    yesPrice: 15,
    noPrice: 85,
    volume: 980000,
    liquidity: 420000,
    createdAt: '2025-03-10T15:00:00+11:00',
  },
  // Culture
  {
    id: '7',
    title: 'Who will be the next James Bond?',
    description: 'Resolves Yes if Aaron Taylor-Johnson is announced as the next James Bond. Resolves No for any other actor.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-10T12:00:00Z',
    yesPrice: 62,
    noPrice: 38,
    volume: 5670000,
    liquidity: 2100000,
    createdAt: '2025-01-05T12:00:00Z',
  },
  {
    id: '8',
    title: 'Will an Australian film win an Oscar at the next Academy Awards?',
    description: 'Resolves Yes if any film primarily produced in Australia wins at least one Academy Award at the 2026 Oscars ceremony.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-03-01T23:59:00-08:00',
    settlementDate: '2026-03-05T12:00:00-08:00',
    yesPrice: 28,
    noPrice: 72,
    volume: 1230000,
    liquidity: 450000,
    createdAt: '2025-02-20T12:00:00+11:00',
  },
  {
    id: '9',
    title: 'Will Australia finish top 5 in Eurovision 2026?',
    description: "Resolves Yes if Australia's entry finishes in the top 5 of the Eurovision Song Contest 2026 Grand Final.",
    category: 'culture',
    status: 'open',
    closeDate: '2026-05-16T23:59:00+02:00',
    settlementDate: '2026-05-18T12:00:00+02:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 780000,
    liquidity: 290000,
    createdAt: '2025-03-01T10:00:00+11:00',
  },
  // Economics
  {
    id: '10',
    title: 'Will the RBA raise the cash rate at the Feb 2026 meeting?',
    description: 'Resolves Yes if the Reserve Bank of Australia announces a cash rate increase at the February 2026 monetary policy meeting.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-02-17T14:30:00+11:00',
    settlementDate: '2026-02-18T12:00:00+11:00',
    yesPrice: 8,
    noPrice: 92,
    volume: 6780000,
    liquidity: 2450000,
    createdAt: '2025-01-08T09:00:00+11:00',
  },
  {
    id: '11',
    title: "Will Australia's CPI fall below 3.0% in the next release?",
    description: 'Resolves Yes if the Australian Bureau of Statistics reports annual CPI below 3.0% in the next quarterly release.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-04-28T11:30:00+10:00',
    settlementDate: '2026-04-29T12:00:00+10:00',
    yesPrice: 67,
    noPrice: 33,
    volume: 3450000,
    liquidity: 1180000,
    createdAt: '2025-02-10T10:00:00+11:00',
  },
  {
    id: '12',
    title: "Will Perth's median dwelling value exceed $850,000 before 31 Dec 2026?",
    description: "Resolves Yes if CoreLogic reports Perth's median dwelling value exceeds $850,000 AUD at any point before December 31, 2026.",
    category: 'economics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+08:00',
    settlementDate: '2027-01-05T12:00:00+08:00',
    yesPrice: 71,
    noPrice: 29,
    volume: 1890000,
    liquidity: 720000,
    createdAt: '2025-01-25T14:00:00+08:00',
  },
  // Climate
  {
    id: '13',
    title: 'Will the Bureau of Meteorology declare a La Nina by October 2026?',
    description: 'Resolves Yes if the Australian Bureau of Meteorology officially declares La Nina conditions before November 1, 2026.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-10-31T23:59:00+11:00',
    settlementDate: '2026-11-05T12:00:00+11:00',
    yesPrice: 45,
    noPrice: 55,
    volume: 890000,
    liquidity: 320000,
    createdAt: '2025-03-01T11:00:00+11:00',
  },
  {
    id: '14',
    title: 'Will Warragamba Dam fall below 60% capacity in 2026?',
    description: 'Resolves Yes if Warragamba Dam storage falls below 60% capacity at any point during 2026, as reported by WaterNSW.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+11:00',
    settlementDate: '2027-01-03T12:00:00+11:00',
    yesPrice: 32,
    noPrice: 68,
    volume: 560000,
    liquidity: 210000,
    createdAt: '2025-02-15T09:00:00+11:00',
  },
  {
    id: '15',
    title: 'Will Australia record its hottest year on record in 2026?',
    description: "Resolves Yes if the Bureau of Meteorology declares 2026 as Australia's hottest year on record in their annual climate statement.",
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+11:00',
    settlementDate: '2027-01-15T12:00:00+11:00',
    yesPrice: 38,
    noPrice: 62,
    volume: 1120000,
    liquidity: 430000,
    createdAt: '2025-01-12T10:00:00+11:00',
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
    marketId: '1', // Federal Election
    side: 'yes',
    quantity: 100,
    avgPrice: 48,
    currentValue: 5200,
    profit: 400,
  },
  {
    id: 'pos-2',
    userId: 'user-1',
    marketId: '5', // Tasmania AFL
    side: 'yes',
    quantity: 50,
    avgPrice: 85,
    currentValue: 4450,
    profit: 200,
  },
  {
    id: 'pos-3',
    userId: 'user-1',
    marketId: '10', // RBA rate
    side: 'no',
    quantity: 75,
    avgPrice: 88,
    currentValue: 6900,
    profit: 300,
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
