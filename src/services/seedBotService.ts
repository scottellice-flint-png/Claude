// ============================================================================
// SEED BOT SERVICE - Passive Quoter with Chinese Wall Compliance
// Internal market maker that ONLY accesses public data
// Implements Avellaneda-Stoikov inventory management
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';
import {
  createOrder,
  cancelOrder,
  getOrderBook,
  getMarketLiquidityState,
  type OrderBook,
} from './tradingEngineService';

// ============================================================================
// TYPES
// ============================================================================

export interface BotConfig {
  // Basic settings
  spreadCents: number;           // Base spread in cents
  minQuantityCents: number;      // Minimum order quantity (10 units = 1000 cents)
  maxInventoryCents: bigint;     // Maximum inventory per side

  // Avellaneda-Stoikov parameters
  gamma: number;                 // Risk aversion (0.01 - 1.0)
  sigma: number;                 // Volatility estimate (0.1 - 2.0)
  kappa: number;                 // Order arrival rate

  // Dynamic spread parameters
  inventorySkewFactor: number;   // How much to skew based on inventory
  spreadWideningFactor: number;  // Emergency spread widening multiplier
}

export interface BotQuote {
  bidPriceCents: number;
  askPriceCents: number;
  bidQuantityCents: number;
  askQuantityCents: number;
  midPriceCents: number;
  effectiveSpreadCents: number;
  inventorySkewCents: number;
  reasonCode: string;
}

export interface BotState {
  botId: string;
  isActive: boolean;
  isHalted: boolean;
  haltReason: string | null;
  currentInventoryYesCents: bigint;
  currentInventoryNoCents: bigint;
  totalPnlCents: bigint;
  totalTradesExecuted: number;
  lastActivityAt: Date | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEED_BOT_CONFIG: BotConfig = {
  spreadCents: 10,               // $0.10 base spread (5 cents each side)
  minQuantityCents: 1000,        // 10 units minimum
  maxInventoryCents: BigInt(1000000), // $10,000 max per side

  // Avellaneda-Stoikov parameters
  gamma: 0.1,                    // Risk aversion
  sigma: 0.5,                    // Volatility estimate
  kappa: 1.5,                    // Order arrival rate

  inventorySkewFactor: 0.1,      // 10% skew per inventory unit
  spreadWideningFactor: 3.0,     // 300% widening under stress
};

// Chinese Wall: Only these endpoints are allowed
const ALLOWED_ENDPOINTS = [
  'GET /api/markets',
  'GET /api/markets/:id',
  'GET /api/orderbook',
  'POST /api/orders',
  'DELETE /api/orders/:id',
];

// ============================================================================
// CHINESE WALL COMPLIANT DATA ACCESS
// Bot can ONLY access public order book data
// ============================================================================

/**
 * Get public market data (Chinese Wall compliant)
 * This simulates calling public API endpoints only
 */
async function getPublicMarketData(marketId: string): Promise<{
  orderBook: OrderBook | null;
  midPriceCents: number | null;
  spreadMultiplier: number;
}> {
  // Get primary outcome
  const primaryOutcome = await prisma.marketOutcome.findFirst({
    where: { marketId, position: 0 },
  });

  if (!primaryOutcome) {
    return { orderBook: null, midPriceCents: null, spreadMultiplier: 1 };
  }

  // Get public order book
  const orderBook = await getOrderBook(marketId, primaryOutcome.id);

  // Get liquidity state for spread multiplier
  const liquidityState = await getMarketLiquidityState(marketId);

  return {
    orderBook,
    midPriceCents: orderBook.midPriceCents || 50,
    spreadMultiplier: liquidityState?.spreadMultiplier || 1,
  };
}

// ============================================================================
// AVELLANEDA-STOIKOV PRICING
// ============================================================================

/**
 * Calculate optimal bid/ask quotes using Avellaneda-Stoikov model
 * This adjusts prices based on inventory to manage risk
 *
 * Reservation price: r = s - q * gamma * sigma^2 * T
 * where:
 *   s = mid price
 *   q = inventory (positive = long, negative = short)
 *   gamma = risk aversion
 *   sigma = volatility
 *   T = time to market close (simplified to 1)
 */
function calculateAvellanedaStoikovQuotes(
  midPriceCents: number,
  inventoryYesCents: bigint,
  inventoryNoCents: bigint,
  config: BotConfig,
  spreadMultiplier: number
): BotQuote {
  // Net inventory in "Yes" terms
  const netInventory = Number(inventoryYesCents) - Number(inventoryNoCents);
  const maxInventory = Number(config.maxInventoryCents);

  // Normalize inventory to -1 to 1 range
  const normalizedInventory = netInventory / maxInventory;

  // Calculate reservation price adjustment (inventory skew)
  // Shifts mid price away from heavy inventory side
  const inventorySkewCents = Math.round(
    normalizedInventory * config.gamma * config.sigma * config.sigma * 100
  );

  // Reservation price (where we'd be indifferent)
  const reservationPriceCents = midPriceCents - inventorySkewCents;

  // Calculate optimal spread using A-S formula
  // delta = (gamma * sigma^2 / 2) + (1/gamma) * ln(1 + gamma/kappa)
  const optimalHalfSpread = Math.round(
    (config.gamma * config.sigma * config.sigma / 2 +
    Math.log(1 + config.gamma / config.kappa) / config.gamma) * 100
  );

  // Apply base spread and spread multiplier
  const effectiveHalfSpread = Math.max(
    Math.round(config.spreadCents / 2),
    optimalHalfSpread
  ) * spreadMultiplier;

  // Calculate bid and ask
  let bidPriceCents = Math.round(reservationPriceCents - effectiveHalfSpread);
  let askPriceCents = Math.round(reservationPriceCents + effectiveHalfSpread);

  // Clamp to valid price range (1-99)
  bidPriceCents = Math.max(1, Math.min(98, bidPriceCents));
  askPriceCents = Math.max(2, Math.min(99, askPriceCents));

  // Ensure bid < ask
  if (bidPriceCents >= askPriceCents) {
    bidPriceCents = askPriceCents - 1;
  }

  // Adjust quantities based on inventory
  // Reduce size on the side we're heavy on
  let bidQuantityCents = config.minQuantityCents;
  let askQuantityCents = config.minQuantityCents;

  if (netInventory > 0) {
    // Long inventory: reduce bid size, increase ask size
    bidQuantityCents = Math.round(config.minQuantityCents * (1 - normalizedInventory));
    askQuantityCents = Math.round(config.minQuantityCents * (1 + normalizedInventory));
  } else if (netInventory < 0) {
    // Short inventory: increase bid size, reduce ask size
    bidQuantityCents = Math.round(config.minQuantityCents * (1 - normalizedInventory));
    askQuantityCents = Math.round(config.minQuantityCents * (1 + normalizedInventory));
  }

  // Ensure minimum quantities
  bidQuantityCents = Math.max(100, bidQuantityCents);
  askQuantityCents = Math.max(100, askQuantityCents);

  return {
    bidPriceCents,
    askPriceCents,
    bidQuantityCents,
    askQuantityCents,
    midPriceCents,
    effectiveSpreadCents: askPriceCents - bidPriceCents,
    inventorySkewCents,
    reasonCode: spreadMultiplier > 1 ? 'WIDENED_SPREAD' : 'NORMAL',
  };
}

// ============================================================================
// BOT OPERATIONS
// ============================================================================

/**
 * Create or update a seed bot
 */
export async function createSeedBot(
  name: string,
  userId: string,
  config?: Partial<BotConfig>
): Promise<{ botId: string }> {
  const bot = await prisma.marketMakerBot.create({
    data: {
      name,
      botType: 'passive_quoter',
      isActive: false,
      config: { ...SEED_BOT_CONFIG, ...config },
      accessLevel: 'public_only', // CRITICAL: Chinese Wall compliance
      userId,
      maxInventoryCents: config?.maxInventoryCents || SEED_BOT_CONFIG.maxInventoryCents,
    },
  });

  return { botId: bot.id };
}

/**
 * Activate a seed bot
 */
export async function activateSeedBot(botId: string): Promise<{ success: boolean; error?: string }> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) {
    return { success: false, error: 'Bot not found' };
  }

  if (bot.accessLevel !== 'public_only') {
    return { success: false, error: 'Bot violates Chinese Wall - must have public_only access' };
  }

  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: {
      isActive: true,
      isHalted: false,
      haltReason: null,
      lastActivityAt: new Date(),
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'system',
    reasonCode: 'SEED_BOT_ACTIVATED',
    metadata: { botId, name: bot.name },
  });

  return { success: true };
}

/**
 * Halt a seed bot
 */
export async function haltSeedBot(
  botId: string,
  reason: string
): Promise<{ success: boolean }> {
  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: {
      isHalted: true,
      haltReason: reason,
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'system',
    reasonCode: 'SEED_BOT_HALTED',
    metadata: { botId, reason },
  });

  return { success: true };
}

/**
 * Run the seed bot quoting logic for a market
 * This is the main entry point called by the background worker
 */
export async function runSeedBotQuoting(
  botId: string,
  marketId: string
): Promise<{
  success: boolean;
  quote?: BotQuote;
  ordersPlaced?: string[];
  error?: string;
}> {
  // Get bot state
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) {
    return { success: false, error: 'Bot not found' };
  }

  if (!bot.isActive || bot.isHalted) {
    return { success: false, error: bot.haltReason || 'Bot is not active' };
  }

  // CHINESE WALL CHECK
  if (bot.accessLevel !== 'public_only') {
    await haltSeedBot(botId, 'CHINESE_WALL_VIOLATION');
    return { success: false, error: 'Chinese Wall violation - bot halted' };
  }

  // Get market status (public data only)
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { id: true, status: true, closesAt: true },
  });

  if (!market || market.status !== 'published') {
    return { success: false, error: 'Market not open for trading' };
  }

  if (market.closesAt && new Date(market.closesAt) <= new Date()) {
    return { success: false, error: 'Market has closed' };
  }

  // Get public market data (Chinese Wall compliant)
  const { orderBook, midPriceCents, spreadMultiplier } = await getPublicMarketData(marketId);

  if (!orderBook || midPriceCents === null) {
    return { success: false, error: 'Could not get market data' };
  }

  // Get bot config
  const config = bot.config as unknown as BotConfig;

  // Calculate optimal quotes using Avellaneda-Stoikov
  const quote = calculateAvellanedaStoikovQuotes(
    midPriceCents,
    bot.currentInventoryYesCents,
    bot.currentInventoryNoCents,
    config,
    spreadMultiplier
  );

  // Check inventory limits
  if (bot.currentInventoryYesCents >= bot.maxInventoryCents ||
      bot.currentInventoryNoCents >= bot.maxInventoryCents) {
    // Hit inventory limit - only quote on the reducing side
    if (bot.currentInventoryYesCents >= bot.maxInventoryCents) {
      quote.bidQuantityCents = 0;
    }
    if (bot.currentInventoryNoCents >= bot.maxInventoryCents) {
      quote.askQuantityCents = 0;
    }
  }

  // Cancel existing bot orders
  const existingOrders = await prisma.order.findMany({
    where: {
      userId: bot.userId || '',
      marketId,
      status: { in: ['open', 'partial'] },
    },
  });

  for (const order of existingOrders) {
    if (bot.userId) {
      await cancelOrder(order.id, bot.userId, 'BOT_REQUOTE');
    }
  }

  // Place new orders if we have a userId
  const ordersPlaced: string[] = [];

  if (bot.userId && orderBook.outcomeId) {
    // Place bid order
    if (quote.bidQuantityCents > 0) {
      const bidResult = await createOrder({
        userId: bot.userId,
        marketId,
        outcomeId: orderBook.outcomeId,
        side: 'buy',
        orderType: 'limit',
        priceCents: quote.bidPriceCents,
        quantityCents: quote.bidQuantityCents,
      });

      if (bidResult.success && bidResult.orderId) {
        ordersPlaced.push(bidResult.orderId);
      }
    }

    // Place ask order
    if (quote.askQuantityCents > 0) {
      const askResult = await createOrder({
        userId: bot.userId,
        marketId,
        outcomeId: orderBook.outcomeId,
        side: 'sell',
        orderType: 'limit',
        priceCents: quote.askPriceCents,
        quantityCents: quote.askQuantityCents,
      });

      if (askResult.success && askResult.orderId) {
        ordersPlaced.push(askResult.orderId);
      }
    }
  }

  // Update bot activity
  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: { lastActivityAt: new Date() },
  });

  return {
    success: true,
    quote,
    ordersPlaced,
  };
}

/**
 * Update bot inventory after a trade
 */
export async function updateBotInventory(
  botId: string,
  side: 'buy' | 'sell',
  quantityCents: number,
  priceCents: number
): Promise<void> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) return;

  // Calculate P&L impact
  // For buys: cost is quantity * price / 100
  // For sells: revenue is quantity * price / 100
  const pnlImpact = side === 'sell'
    ? Math.floor(quantityCents * priceCents / 100)
    : -Math.floor(quantityCents * priceCents / 100);

  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: {
      currentInventoryYesCents: side === 'buy'
        ? { increment: quantityCents }
        : undefined,
      currentInventoryNoCents: side === 'sell'
        ? { increment: quantityCents }
        : undefined,
      totalPnlCents: { increment: pnlImpact },
      totalTradesExecuted: { increment: 1 },
      totalVolumeProvidedCents: { increment: quantityCents },
    },
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get bot state
 */
export async function getBotState(botId: string): Promise<BotState | null> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) return null;

  return {
    botId: bot.id,
    isActive: bot.isActive,
    isHalted: bot.isHalted,
    haltReason: bot.haltReason,
    currentInventoryYesCents: bot.currentInventoryYesCents,
    currentInventoryNoCents: bot.currentInventoryNoCents,
    totalPnlCents: bot.totalPnlCents,
    totalTradesExecuted: bot.totalTradesExecuted,
    lastActivityAt: bot.lastActivityAt,
  };
}

/**
 * Get all active bots
 */
export async function getActiveBots() {
  return prisma.marketMakerBot.findMany({
    where: { isActive: true, isHalted: false },
  });
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * Main seed bot background worker
 * Should be called every few seconds to maintain quotes
 */
export async function seedBotBackgroundWorker(): Promise<{
  botsProcessed: number;
  marketsQuoted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let botsProcessed = 0;
  let marketsQuoted = 0;

  try {
    // Get all active bots
    const activeBots = await getActiveBots();

    // Get all published markets
    const markets = await prisma.market.findMany({
      where: { status: 'published' },
      select: { id: true },
    });

    for (const bot of activeBots) {
      botsProcessed++;

      for (const market of markets) {
        try {
          const result = await runSeedBotQuoting(bot.id, market.id);

          if (result.success) {
            marketsQuoted++;
          } else if (result.error) {
            errors.push(`Bot ${bot.id} / Market ${market.id}: ${result.error}`);
          }
        } catch (error) {
          errors.push(`Bot ${bot.id} / Market ${market.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Worker error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { botsProcessed, marketsQuoted, errors };
}
