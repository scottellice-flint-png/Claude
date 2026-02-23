// ============================================================================
// TRADING ENGINE CRON - Background Workers
// POST /api/cron/trading-engine
// ============================================================================
//
// This endpoint should be called by Vercel Cron or an external scheduler.
// Runs multiple workers:
// 1. Batch processor (every 200ms - called more frequently)
// 2. Oracle deadman check (every 5s)
// 3. Seed bot quoting (every 2-5s)
// 4. Sports compliance (every 30s)
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { tradingEngineWorker } from '@/services/tradingEngineServiceV2';
import { oracleServiceWorker, checkDeadmanSwitch } from '@/services/oracleLockService';
import { seedBotBackgroundWorkerV2 } from '@/services/seedBotServiceV2';
import { writeAuditEvent } from '@/services/auditEventService';

interface CronRequest {
  worker: 'batch' | 'oracle' | 'seedbot' | 'all';
  secret?: string;
}

interface CronResponse {
  success: boolean;
  worker: string;
  results?: {
    batch?: {
      marketsProcessed: number;
      ordersProcessed: number;
      tradesCreated: number;
      errors: string[];
    };
    oracle?: {
      deadmanMarketsLocked: number;
      sportsMarketsLocked: number;
      errors: string[];
    };
    seedbot?: {
      botsProcessed: number;
      marketsQuoted: number;
      killSwitchesTriggered: number;
      errors: string[];
    };
  };
  durationMs: number;
  error?: string;
}

// Verify cron secret
function verifyCronSecret(req: NextApiRequest): boolean {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    // In development, allow without secret
    return process.env.NODE_ENV === 'development';
  }

  return secret === expectedSecret;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const startMs = Date.now();

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      worker: 'none',
      durationMs: Date.now() - startMs,
      error: 'Method not allowed',
    });
  }

  // Verify secret
  if (!verifyCronSecret(req)) {
    return res.status(401).json({
      success: false,
      worker: 'none',
      durationMs: Date.now() - startMs,
      error: 'Invalid cron secret',
    });
  }

  try {
    const body = req.body as CronRequest;
    const worker = body.worker || 'all';

    const results: CronResponse['results'] = {};

    // Run batch processor
    if (worker === 'batch' || worker === 'all') {
      const batchResult = await tradingEngineWorker();
      results.batch = {
        marketsProcessed: batchResult.batchResults.filter(r => r.success).length,
        ordersProcessed: batchResult.batchResults.reduce((sum, r) => sum + r.ordersProcessed, 0),
        tradesCreated: batchResult.batchResults.reduce((sum, r) => sum + r.tradesCreated, 0),
        errors: batchResult.errors,
      };
    }

    // Run oracle checks
    if (worker === 'oracle' || worker === 'all') {
      const oracleResult = await oracleServiceWorker();
      results.oracle = {
        deadmanMarketsLocked: oracleResult.deadmanResult.marketsLocked,
        sportsMarketsLocked: oracleResult.sportsResult.marketsLocked,
        errors: [
          ...oracleResult.deadmanResult.errors,
          ...oracleResult.sportsResult.errors,
        ],
      };
    }

    // Run seed bot
    if (worker === 'seedbot' || worker === 'all') {
      const seedbotResult = await seedBotBackgroundWorkerV2();
      results.seedbot = {
        botsProcessed: seedbotResult.botsProcessed,
        marketsQuoted: seedbotResult.marketsQuoted,
        killSwitchesTriggered: seedbotResult.killSwitchesTriggered,
        errors: seedbotResult.errors,
      };
    }

    const durationMs = Date.now() - startMs;

    // Log if there were errors
    const allErrors = [
      ...(results.batch?.errors || []),
      ...(results.oracle?.errors || []),
      ...(results.seedbot?.errors || []),
    ];

    if (allErrors.length > 0) {
      await writeAuditEvent({
        eventType: 'ADMIN_ACCOUNT_ACTION',
        actorType: 'system',
        reasonCode: 'CRON_ERRORS',
        metadata: {
          worker,
          errors: allErrors,
          durationMs,
        },
      });
    }

    return res.status(200).json({
      success: true,
      worker,
      results,
      durationMs,
    });

  } catch (error) {
    console.error('Cron handler error:', error);

    await writeAuditEvent({
      eventType: 'ADMIN_ACCOUNT_ACTION',
      actorType: 'system',
      reasonCode: 'CRON_FATAL_ERROR',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return res.status(500).json({
      success: false,
      worker: 'all',
      durationMs: Date.now() - startMs,
      error: error instanceof Error ? error.message : 'Internal error',
    });
  }
}

// Set a longer timeout for cron jobs
export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 60,  // 60 seconds max (Vercel Pro)
};
