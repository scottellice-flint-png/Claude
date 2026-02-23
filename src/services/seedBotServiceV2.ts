// ============================================================================
// SEED BOT SERVICE V2 - Hardened Internal Quoter
// Chinese Wall Compliant | NT 2024 Requirements
// ============================================================================
//
// Hardening Features:
// - Order TTL (2-5 seconds)
// - Kill switch on rolling loss
// - Global exposure cap
// - Per-market inventory cap
// - Volatility-based spread widening
// - Cooldown after kill switch activation
// - Full audit logging
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';
import {
  createOrderV2,
  cancelOrderV2,
  getSharpShieldLiquidityState,
} from './tradingEngineServiceV2';
import { isMarketLocked } from './oracleLockService';

// ============================================================================
// TYPES
// ============================================================================

export interface BotConfigV2 {
  // Basic settings
  spreadCents: number;
  minQuantityCents: number;
  maxInventoryCents: number;

  // Avellaneda-Stoikov parameters
  gamma: number;
  sigma: number;
  kappa: number;

  // Dynamic spread
  inventorySkewFactor: number;
  spreadWideningFactor: number;

  // V2 Hardening
  orderTtlMs: number;               // 2000-5000ms
  maxRollingLossCents: number;      // Kill switch threshold
  rollingPnlWindowMs: number;       // Rolling P&L window
  globalExposureCapCents: number;   // Total exposure across all markets
  perMarketCapCents: number;        // Max inventory per market
  volatilityWidenThreshold: number; // Spread multiplier trigger
  cooldownDurationMs: number;       // Cooldown after kill switch
}

export interface BotQuoteV2 {
  bidPriceCents: number;
  askPriceCents: number;
  bidQuantityCents: number;
  askQuantityCents: number;
  midPriceCents: number;
  effectiveSpreadCents: number;
  inventorySkewCents: number;
  ttlMs: number;
  expiresAt: Date;
  reasonCode: string;
}

export interface BotStateV2 {
  botId: string;
  name: string;
  isActive: boolean;
  isHalted: boolean;
  haltReason: string | null;
  killSwitchActive: boolean;
  killSwitchReason: string | null;
  currentInventoryYesCents: number;
  currentInventoryNoCents: number;
  currentGlobalExposureCents: number;
  rollingPnlCents: number;
  totalPnlCents: number;
  totalTradesExecuted: number;
  cooldownUntil: Date | null;
  lastActivityAt: Date | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEED_BOT_CONFIG_V2: BotConfigV2 = {
  // Base settings
  spreadCents: 10,                    // $0.10 base spread
  minQuantityCents: 1000,             // 10 units minimum
  maxInventoryCents: 1000000,         // $10,000 max per side

  // Avellaneda-Stoikov
  gamma: 0.1,
  sigma: 0.5,
  kappa: 1.5,

  // Dynamic spread
  inventorySkewFactor: 0.1,
  spreadWideningFactor: 3.0,

  // V2 HARDENING
  orderTtlMs: 3000,                   // 3 second TTL
  maxRollingLossCents: 100000,        // $1,000 rolling loss triggers kill
  rollingPnlWindowMs: 300000,         // 5 minute rolling window
  globalExposureCapCents: 5000000,    // $50,000 global exposure cap
  perMarketCapCents: 500000,          // $5,000 per-market cap
  volatilityWidenThreshold: 2.0,      // Widen spread at 2x normal volatility
  cooldownDurationMs: 60000,          // 1 minute cooldown after kill
};

// Chinese Wall: Public endpoints only
const ALLOWED_PUBLIC_ACCESS = [
  'orderBook',
  'liquidityState',
  'marketStatus',
  'publicVolatility',
];

// ============================================================================
// BOT MANAGEMENT
// ============================================================================

/**
 * Create a new hardened seed bot
 */
export async function createSeedBotV2(
  name: string,
  userId: string,
  config?: Partial<BotConfigV2>
): Promise<{ botId: string }> {
  const mergedConfig = { ...SEED_BOT_CONFIG_V2, ...config };

  const bot = await prisma.marketMakerBot.create({
    data: {
      name,
      botType: 'passive_quoter_v2',
      isActive: false,
      config: JSON.stringify(mergedConfig),
      accessLevel: 'public_only',
      userId,
      maxInventoryCents: BigInt(mergedConfig.maxInventoryCents),
      orderTtlMs: mergedConfig.orderTtlMs,
      maxRollingLossCents: BigInt(mergedConfig.maxRollingLossCents),
      rollingPnlWindowMs: mergedConfig.rollingPnlWindowMs,
      globalExposureCapCents: BigInt(mergedConfig.globalExposureCapCents),
      perMarketCapCents: BigInt(mergedConfig.perMarketCapCents),
      volatilityWidenThreshold: mergedConfig.volatilityWidenThreshold,
      cooldownDurationMs: mergedConfig.cooldownDurationMs,
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'system',
    reasonCode: 'SEED_BOT_CREATED',
    metadata: { botId: bot.id, name, config: mergedConfig },
  });

  return { botId: bot.id };
}

/**
 * Activate a seed bot
 */
export async function activateSeedBotV2(botId: string): Promise<{ success: boolean; error?: string }> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) {
    return { success: false, error: 'Bot not found' };
  }

  // Chinese Wall check
  if (bot.accessLevel !== 'public_only') {
    return { success: false, error: 'Bot violates Chinese Wall - must have public_only access' };
  }

  // Check cooldown
  if (bot.cooldownUntil && new Date(bot.cooldownUntil) > new Date()) {
    return {
      success: false,
      error: `Bot is in cooldown until ${bot.cooldownUntil.toISOString()}`,
    };
  }

  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: {
      isActive: true,
      isHalted: false,
      haltReason: null,
      killSwitchActive: false,
      killSwitchReason: null,
      killSwitchActivatedAt: null,
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
 * Trigger kill switch on bot
 */
export async function triggerKillSwitch(
  botId: string,
  reason: string
): Promise<{ success: boolean }> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) {
    return { success: false };
  }

  const config = bot.config as BotConfigV2;
  const cooldownUntil = new Date(Date.now() + (config.cooldownDurationMs || 60000));

  // Cancel all bot's open orders
  const openOrders = await prisma.order.findMany({
    where: {
      userId: bot.userId || undefined,
      status: { in: ['open', 'partial', 'pending'] },
    },
  });

  for (const order of openOrders) {
    if (bot.userId) {
      await cancelOrderV2(order.id, bot.userId, 'KILL_SWITCH');
    }
  }

  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: {
      isActive: false,
      isHalted: true,
      haltReason: reason,
      killSwitchActive: true,
      killSwitchReason: reason,
      killSwitchActivatedAt: new Date(),
      cooldownUntil,
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'system',
    reasonCode: 'SEED_BOT_KILL_SWITCH',
    metadata: {
      botId,
      reason,
      ordersCancelled: openOrders.length,
      cooldownUntil: cooldownUntil.toISOString(),
    },
  });

  return { success: true };
}

/**
 * Halt bot (without kill switch)
 */
export async function haltSeedBotV2(
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

// ============================================================================
// PUBLIC DATA ACCESS (Chinese Wall Compliant)
// ============================================================================

interface PublicMarketData {
  midPriceCents: number;
  spreadMultiplier: number;
  volatilityMetric: number;
  bestBidCents: number | null;
  bestAskCents: number | null;
  effectiveDepthCents: number;
}

/**
 * Get public market data (Chinese Wall compliant)
 */
async function getPublicMarketDataV2(marketId: string): Promise<PublicMarketData | null> {
  const liquidityState = await getSharpShieldLiquidityState(marketId);

  if (!liquidityState) {
    return null;
  }

  // Calculate volatility metric from trade velocity
  const recentTrades = await prisma.trade.count({
    where: {
      marketId,
      executedAt: { gte: new Date(Date.now() - 60000) },
    },
  });

  // Simple volatility proxy: trades per minute normalized
  const volatilityMetric = recentTrades / 10; // Normalized to ~1 for moderate activity

  return {
    midPriceCents: liquidityState.midPriceCents || 50,
    spreadMultiplier: 1.0, // Will be adjusted by volatility
    volatilityMetric,
    bestBidCents: liquidityState.bestBidCents,
    bestAskCents: liquidityState.bestAskCents,
    effectiveDepthCents: liquidityState.effectiveDepthCents,
  };
}

// ============================================================================
// AVELLANEDA-STOIKOV QUOTING V2
// ============================================================================

/**
 * Calculate optimal quotes with V2 hardening
 */
function calculateAvellanedaStoikovQuotesV2(
  midPriceCents: number,
  inventoryYesCents: number,
  inventoryNoCents: number,
  volatilityMetric: number,
  config: BotConfigV2
): BotQuoteV2 {
  const now = new Date();

  // Net inventory
  const netInventory = inventoryYesCents - inventoryNoCents;
  const maxInventory = config.maxInventoryCents;
  const normalizedInventory = netInventory / maxInventory;

  // Inventory skew (A-S formula)
  const inventorySkewCents = Math.round(
    normalizedInventory * config.gamma * config.sigma * config.sigma * 100
  );

  // Reservation price
  const reservationPriceCents = midPriceCents - inventorySkewCents;

  // Optimal half-spread
  const optimalHalfSpread = Math.round(
    (config.gamma * config.sigma * config.sigma / 2 +
    Math.log(1 + config.gamma / config.kappa) / config.gamma) * 100
  );

  // Apply volatility-based widening
  let spreadMultiplier = 1.0;
  let reasonCode = 'NORMAL';

  if (volatilityMetric >= config.volatilityWidenThreshold) {
    spreadMultiplier = config.spreadWideningFactor;
    reasonCode = 'VOLATILITY_WIDENED';
  } else if (volatilityMetric >= 1.5) {
    spreadMultiplier = 2.0;
    reasonCode = 'ELEVATED_VOLATILITY';
  }

  // Calculate effective spread
  const effectiveHalfSpread = Math.max(
    Math.round(config.spreadCents / 2),
    optimalHalfSpread
  ) * spreadMultiplier;

  // Calculate quotes
  let bidPriceCents = Math.round(reservationPriceCents - effectiveHalfSpread);
  let askPriceCents = Math.round(reservationPriceCents + effectiveHalfSpread);

  // Clamp to valid range
  bidPriceCents = Math.max(1, Math.min(98, bidPriceCents));
  askPriceCents = Math.max(2, Math.min(99, askPriceCents));

  // Ensure bid < ask
  if (bidPriceCents >= askPriceCents) {
    bidPriceCents = askPriceCents - 1;
  }

  // Adjust quantities based on inventory
  let bidQuantityCents = config.minQuantityCents;
  let askQuantityCents = config.minQuantityCents;

  if (netInventory > 0) {
    // Long: reduce bid, increase ask
    bidQuantityCents = Math.round(config.minQuantityCents * (1 - normalizedInventory * 0.5));
    askQuantityCents = Math.round(config.minQuantityCents * (1 + normalizedInventory * 0.5));
  } else if (netInventory < 0) {
    // Short: increase bid, reduce ask
    bidQuantityCents = Math.round(config.minQuantityCents * (1 + Math.abs(normalizedInventory) * 0.5));
    askQuantityCents = Math.round(config.minQuantityCents * (1 - Math.abs(normalizedInventory) * 0.5));
  }

  // Minimum quantities
  bidQuantityCents = Math.max(100, bidQuantityCents);
  askQuantityCents = Math.max(100, askQuantityCents);

  // TTL
  const ttlMs = config.orderTtlMs;
  const expiresAt = new Date(now.getTime() + ttlMs);

  return {
    bidPriceCents,
    askPriceCents,
    bidQuantityCents,
    askQuantityCents,
    midPriceCents,
    effectiveSpreadCents: askPriceCents - bidPriceCents,
    inventorySkewCents,
    ttlMs,
    expiresAt,
    reasonCode,
  };
}

// ============================================================================
// QUOTING LOGIC V2
// ============================================================================

/**
 * Run seed bot quoting for a market (V2 hardened)
 */
export async function runSeedBotQuotingV2(
  botId: string,
  marketId: string
): Promise<{
  success: boolean;
  quote?: BotQuoteV2;
  ordersPlaced?: string[];
  error?: string;
  killSwitchTriggered?: boolean;
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

  if (bot.killSwitchActive) {
    return { success: false, error: 'Kill switch is active' };
  }

  // Check cooldown
  if (bot.cooldownUntil && new Date(bot.cooldownUntil) > new Date()) {
    return { success: false, error: 'Bot is in cooldown' };
  }

  // Chinese Wall check
  if (bot.accessLevel !== 'public_only') {
    await triggerKillSwitch(botId, 'CHINESE_WALL_VIOLATION');
    return { success: false, error: 'Chinese Wall violation', killSwitchTriggered: true };
  }

  // Check oracle lock
  const locked = await isMarketLocked(marketId);
  if (locked) {
    return { success: false, error: 'Market is oracle locked' };
  }

  // Check market status
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

  const config = bot.config as BotConfigV2;

  // Check global exposure cap
  const globalExposure = Number(bot.currentGlobalExposureCents);
  if (globalExposure >= config.globalExposureCapCents) {
    return { success: false, error: 'Global exposure cap reached' };
  }

  // Check rolling P&L for kill switch
  const rollingPnl = Number(bot.rollingPnlCents);
  if (rollingPnl <= -config.maxRollingLossCents) {
    await triggerKillSwitch(botId, 'ROLLING_LOSS_EXCEEDED');
    return {
      success: false,
      error: 'Kill switch triggered: rolling loss exceeded',
      killSwitchTriggered: true,
    };
  }

  // Get public market data (Chinese Wall compliant)
  const marketData = await getPublicMarketDataV2(marketId);
  if (!marketData) {
    return { success: false, error: 'Could not get market data' };
  }

  // Calculate quotes
  const quote = calculateAvellanedaStoikovQuotesV2(
    marketData.midPriceCents,
    Number(bot.currentInventoryYesCents),
    Number(bot.currentInventoryNoCents),
    marketData.volatilityMetric,
    config
  );

  // Check per-market inventory cap
  const currentMarketInventory = Math.max(
    Number(bot.currentInventoryYesCents),
    Number(bot.currentInventoryNoCents)
  );

  if (currentMarketInventory >= config.perMarketCapCents) {
    // Only quote on reducing side
    if (Number(bot.currentInventoryYesCents) >= config.perMarketCapCents) {
      quote.bidQuantityCents = 0;
    }
    if (Number(bot.currentInventoryNoCents) >= config.perMarketCapCents) {
      quote.askQuantityCents = 0;
    }
  }

  // Cancel existing orders (TTL expired or requote)
  if (bot.userId) {
    const existingOrders = await prisma.order.findMany({
      where: {
        userId: bot.userId,
        marketId,
        status: { in: ['open', 'partial', 'pending'] },
      },
    });

    for (const order of existingOrders) {
      await cancelOrderV2(order.id, bot.userId, 'BOT_REQUOTE');
    }
  }

  // Get outcome ID
  const primaryOutcome = await prisma.marketOutcome.findFirst({
    where: { marketId, position: 0 },
  });

  if (!primaryOutcome || !bot.userId) {
    return { success: false, error: 'Cannot place orders' };
  }

  const ordersPlaced: string[] = [];

  // Place bid order
  if (quote.bidQuantityCents > 0) {
    const bidResult = await createOrderV2({
      userId: bot.userId,
      marketId,
      outcomeId: primaryOutcome.id,
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
    const askResult = await createOrderV2({
      userId: bot.userId,
      marketId,
      outcomeId: primaryOutcome.id,
      side: 'sell',
      orderType: 'limit',
      priceCents: quote.askPriceCents,
      quantityCents: quote.askQuantityCents,
    });

    if (askResult.success && askResult.orderId) {
      ordersPlaced.push(askResult.orderId);
    }
  }

  // Update bot activity
  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: { lastActivityAt: new Date() },
  });

  // Log audit
  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'system',
    reasonCode: 'SEED_BOT_QUOTED',
    marketId,
    metadata: {
      botId,
      quote,
      ordersPlaced,
      globalExposure,
      rollingPnl,
    },
  });

  return {
    success: true,
    quote,
    ordersPlaced,
  };
}

/**
 * Update bot inventory and P&L after a fill
 */
export async function updateBotInventoryV2(
  botId: string,
  marketId: string,
  side: 'buy' | 'sell',
  quantityCents: number,
  priceCents: number
): Promise<void> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) return;

  const config = bot.config as BotConfigV2;

  // P&L impact (buy = cost/negative, sell = revenue/positive)
  const pnlImpact = side === 'sell'
    ? Math.floor(quantityCents * priceCents / 100)
    : -Math.floor(quantityCents * priceCents / 100);

  // Update rolling P&L (simplified: just add to current value)
  // In production, this should use a proper sliding window
  const newRollingPnl = Number(bot.rollingPnlCents) + pnlImpact;

  // Update exposure (absolute value of inventory)
  const newYesInventory = side === 'buy'
    ? Number(bot.currentInventoryYesCents) + quantityCents
    : Number(bot.currentInventoryYesCents);
  const newNoInventory = side === 'sell'
    ? Number(bot.currentInventoryNoCents) + quantityCents
    : Number(bot.currentInventoryNoCents);
  const newExposure = Math.abs(newYesInventory - newNoInventory);

  await prisma.marketMakerBot.update({
    where: { id: botId },
    data: {
      currentInventoryYesCents: side === 'buy'
        ? { increment: quantityCents }
        : undefined,
      currentInventoryNoCents: side === 'sell'
        ? { increment: quantityCents }
        : undefined,
      currentGlobalExposureCents: BigInt(newExposure),
      rollingPnlCents: BigInt(newRollingPnl),
      totalPnlCents: { increment: pnlImpact },
      totalTradesExecuted: { increment: 1 },
      totalVolumeProvidedCents: { increment: quantityCents },
    },
  });

  // Check if kill switch should trigger
  if (newRollingPnl <= -config.maxRollingLossCents) {
    await triggerKillSwitch(botId, 'ROLLING_LOSS_AFTER_FILL');
  }
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getBotStateV2(botId: string): Promise<BotStateV2 | null> {
  const bot = await prisma.marketMakerBot.findUnique({
    where: { id: botId },
  });

  if (!bot) return null;

  return {
    botId: bot.id,
    name: bot.name,
    isActive: bot.isActive,
    isHalted: bot.isHalted,
    haltReason: bot.haltReason,
    killSwitchActive: bot.killSwitchActive,
    killSwitchReason: bot.killSwitchReason,
    currentInventoryYesCents: Number(bot.currentInventoryYesCents),
    currentInventoryNoCents: Number(bot.currentInventoryNoCents),
    currentGlobalExposureCents: Number(bot.currentGlobalExposureCents),
    rollingPnlCents: Number(bot.rollingPnlCents),
    totalPnlCents: Number(bot.totalPnlCents),
    totalTradesExecuted: bot.totalTradesExecuted,
    cooldownUntil: bot.cooldownUntil,
    lastActivityAt: bot.lastActivityAt,
  };
}

export async function getActiveBotsV2() {
  return prisma.marketMakerBot.findMany({
    where: {
      isActive: true,
      isHalted: false,
      killSwitchActive: false,
      OR: [
        { cooldownUntil: null },
        { cooldownUntil: { lt: new Date() } },
      ],
    },
  });
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

export async function seedBotBackgroundWorkerV2(): Promise<{
  botsProcessed: number;
  marketsQuoted: number;
  killSwitchesTriggered: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let botsProcessed = 0;
  let marketsQuoted = 0;
  let killSwitchesTriggered = 0;

  try {
    const activeBots = await getActiveBotsV2();
    const markets = await prisma.market.findMany({
      where: { status: 'published' },
      select: { id: true },
    });

    for (const bot of activeBots) {
      botsProcessed++;

      for (const market of markets) {
        try {
          const result = await runSeedBotQuotingV2(bot.id, market.id);

          if (result.success) {
            marketsQuoted++;
          } else if (result.killSwitchTriggered) {
            killSwitchesTriggered++;
            break; // Stop quoting for this bot
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

  return { botsProcessed, marketsQuoted, killSwitchesTriggered, errors };
}
