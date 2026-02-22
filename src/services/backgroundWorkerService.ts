// ============================================================================
// BACKGROUND WORKER SERVICE
// Runs periodic tasks for the Fortress Trading Engine
// ============================================================================

import { processTakerQueue } from './tradingEngineService';
import { lipBackgroundWorker } from './lipService';
import { dmmBackgroundWorker } from './dmmService';
import { seedBotBackgroundWorker } from './seedBotService';
import { riskDefenseBackgroundWorker } from './riskDefenseService';
import { retryFailedSettlements } from './settlementService';

// ============================================================================
// TYPES
// ============================================================================

interface WorkerResult {
  worker: string;
  success: boolean;
  duration: number;
  result?: Record<string, unknown>;
  error?: string;
}

interface BackgroundWorkerStats {
  lastRun: Date;
  runCount: number;
  successCount: number;
  errorCount: number;
  results: WorkerResult[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORKER_CONFIG = {
  // Taker queue processing - every 100ms
  TAKER_QUEUE_INTERVAL_MS: 100,

  // Seed bot quoting - every 5 seconds
  SEED_BOT_INTERVAL_MS: 5000,

  // LIP tracking - every 1 minute
  LIP_INTERVAL_MS: 60000,

  // DMM monitoring - every 1 minute
  DMM_INTERVAL_MS: 60000,

  // Risk defense scanning - every 30 seconds
  RISK_DEFENSE_INTERVAL_MS: 30000,

  // Settlement retry - every 5 minutes
  SETTLEMENT_RETRY_INTERVAL_MS: 300000,
};

// ============================================================================
// WORKER STATE
// ============================================================================

let isRunning = false;
let takerQueueInterval: NodeJS.Timeout | null = null;
let seedBotInterval: NodeJS.Timeout | null = null;
let lipInterval: NodeJS.Timeout | null = null;
let dmmInterval: NodeJS.Timeout | null = null;
let riskDefenseInterval: NodeJS.Timeout | null = null;
let settlementRetryInterval: NodeJS.Timeout | null = null;

const stats: Record<string, BackgroundWorkerStats> = {
  takerQueue: { lastRun: new Date(), runCount: 0, successCount: 0, errorCount: 0, results: [] },
  seedBot: { lastRun: new Date(), runCount: 0, successCount: 0, errorCount: 0, results: [] },
  lip: { lastRun: new Date(), runCount: 0, successCount: 0, errorCount: 0, results: [] },
  dmm: { lastRun: new Date(), runCount: 0, successCount: 0, errorCount: 0, results: [] },
  riskDefense: { lastRun: new Date(), runCount: 0, successCount: 0, errorCount: 0, results: [] },
  settlementRetry: { lastRun: new Date(), runCount: 0, successCount: 0, errorCount: 0, results: [] },
};

// ============================================================================
// WORKER EXECUTION HELPERS
// ============================================================================

async function runWorker(
  name: string,
  worker: () => Promise<unknown>
): Promise<WorkerResult> {
  const startTime = Date.now();
  const workerStats = stats[name];

  try {
    const result = await worker();
    const duration = Date.now() - startTime;

    workerStats.lastRun = new Date();
    workerStats.runCount++;
    workerStats.successCount++;

    const workerResult: WorkerResult = {
      worker: name,
      success: true,
      duration,
      result: result as Record<string, unknown>,
    };

    // Keep last 10 results
    workerStats.results.unshift(workerResult);
    if (workerStats.results.length > 10) {
      workerStats.results.pop();
    }

    return workerResult;
  } catch (error) {
    const duration = Date.now() - startTime;

    workerStats.lastRun = new Date();
    workerStats.runCount++;
    workerStats.errorCount++;

    const workerResult: WorkerResult = {
      worker: name,
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    workerStats.results.unshift(workerResult);
    if (workerStats.results.length > 10) {
      workerStats.results.pop();
    }

    console.error(`[BackgroundWorker] ${name} failed:`, error);
    return workerResult;
  }
}

// ============================================================================
// INDIVIDUAL WORKERS
// ============================================================================

async function runTakerQueueWorker(): Promise<WorkerResult> {
  return runWorker('takerQueue', async () => {
    const result = await processTakerQueue();
    return {
      processed: result.processed,
      resultsCount: result.results.length,
    };
  });
}

async function runSeedBotWorker(): Promise<WorkerResult> {
  return runWorker('seedBot', async () => {
    const result = await seedBotBackgroundWorker();
    return {
      botsProcessed: result.botsProcessed,
      marketsQuoted: result.marketsQuoted,
      errorsCount: result.errors.length,
    };
  });
}

async function runLIPWorker(): Promise<WorkerResult> {
  return runWorker('lip', async () => {
    await lipBackgroundWorker();
    return { completed: true };
  });
}

async function runDMMWorker(): Promise<WorkerResult> {
  return runWorker('dmm', async () => {
    await dmmBackgroundWorker();
    return { completed: true };
  });
}

async function runRiskDefenseWorker(): Promise<WorkerResult> {
  return runWorker('riskDefense', async () => {
    const result = await riskDefenseBackgroundWorker();
    return {
      marketsChecked: result.marketsChecked,
      usersChecked: result.usersChecked,
      eventsGenerated: result.eventsGenerated,
    };
  });
}

async function runSettlementRetryWorker(): Promise<WorkerResult> {
  return runWorker('settlementRetry', async () => {
    const result = await retryFailedSettlements();
    return {
      retried: result.retried,
      succeeded: result.succeeded,
      failed: result.failed,
    };
  });
}

// ============================================================================
// START/STOP FUNCTIONS
// ============================================================================

/**
 * Start all background workers
 */
export function startBackgroundWorkers(): void {
  if (isRunning) {
    console.log('[BackgroundWorker] Already running');
    return;
  }

  console.log('[BackgroundWorker] Starting all workers...');
  isRunning = true;

  // Taker queue - fast processing
  takerQueueInterval = setInterval(runTakerQueueWorker, WORKER_CONFIG.TAKER_QUEUE_INTERVAL_MS);

  // Seed bot - moderate frequency
  seedBotInterval = setInterval(runSeedBotWorker, WORKER_CONFIG.SEED_BOT_INTERVAL_MS);

  // LIP - every minute
  lipInterval = setInterval(runLIPWorker, WORKER_CONFIG.LIP_INTERVAL_MS);

  // DMM - every minute
  dmmInterval = setInterval(runDMMWorker, WORKER_CONFIG.DMM_INTERVAL_MS);

  // Risk defense - every 30 seconds
  riskDefenseInterval = setInterval(runRiskDefenseWorker, WORKER_CONFIG.RISK_DEFENSE_INTERVAL_MS);

  // Settlement retry - every 5 minutes
  settlementRetryInterval = setInterval(runSettlementRetryWorker, WORKER_CONFIG.SETTLEMENT_RETRY_INTERVAL_MS);

  console.log('[BackgroundWorker] All workers started');
}

/**
 * Stop all background workers
 */
export function stopBackgroundWorkers(): void {
  if (!isRunning) {
    console.log('[BackgroundWorker] Not running');
    return;
  }

  console.log('[BackgroundWorker] Stopping all workers...');

  if (takerQueueInterval) clearInterval(takerQueueInterval);
  if (seedBotInterval) clearInterval(seedBotInterval);
  if (lipInterval) clearInterval(lipInterval);
  if (dmmInterval) clearInterval(dmmInterval);
  if (riskDefenseInterval) clearInterval(riskDefenseInterval);
  if (settlementRetryInterval) clearInterval(settlementRetryInterval);

  takerQueueInterval = null;
  seedBotInterval = null;
  lipInterval = null;
  dmmInterval = null;
  riskDefenseInterval = null;
  settlementRetryInterval = null;

  isRunning = false;
  console.log('[BackgroundWorker] All workers stopped');
}

/**
 * Get worker status and statistics
 */
export function getWorkerStats(): {
  isRunning: boolean;
  workers: Record<string, BackgroundWorkerStats>;
} {
  return {
    isRunning,
    workers: { ...stats },
  };
}

/**
 * Run a single iteration of all workers (for testing/manual trigger)
 */
export async function runAllWorkersOnce(): Promise<WorkerResult[]> {
  const results: WorkerResult[] = [];

  results.push(await runTakerQueueWorker());
  results.push(await runSeedBotWorker());
  results.push(await runLIPWorker());
  results.push(await runDMMWorker());
  results.push(await runRiskDefenseWorker());
  results.push(await runSettlementRetryWorker());

  return results;
}
