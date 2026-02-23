// ============================================================================
// ORACLE EVENTS API - Push-Based Oracle Lock Triggers
// POST /api/oracle/events
// ============================================================================
//
// Receives oracle events from external data providers (e.g., Sportradar)
// and triggers appropriate market locks.
//
// CRITICAL: This endpoint must process with minimal latency.
// Lock must execute BEFORE the next taker batch processes.
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  handleOracleEvent,
  updateOracleHeartbeat,
  type OracleEvent,
  type OracleLockResult,
} from '@/services/oracleLockService';
import { writeAuditEvent } from '@/services/auditEventService';

// ============================================================================
// TYPES
// ============================================================================

interface OracleEventRequest {
  eventType: string;
  eventSource: string;
  eventTsMs: number;
  marketId: string;
  payload: Record<string, unknown>;
  signature?: string;  // For authentication
}

interface OracleHeartbeatRequest {
  marketIds: string[];
}

interface ApiResponse {
  success: boolean;
  result?: OracleLockResult | null;
  heartbeatsUpdated?: number;
  error?: string;
  processingMs?: number;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function validateOracleSignature(
  req: NextApiRequest,
  body: OracleEventRequest
): boolean {
  // In production, implement HMAC signature validation
  // For now, check for API key header
  const apiKey = req.headers['x-oracle-api-key'];

  if (!apiKey) {
    return false;
  }

  // Check against configured oracle API keys
  const validKeys = (process.env.ORACLE_API_KEYS || '').split(',');
  return validKeys.includes(apiKey as string);
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const startMs = Date.now();

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body as OracleEventRequest | OracleHeartbeatRequest;

    // Handle heartbeat requests
    if ('marketIds' in body) {
      const heartbeatReq = body as OracleHeartbeatRequest;
      let updated = 0;

      for (const marketId of heartbeatReq.marketIds) {
        const result = await updateOracleHeartbeat(marketId);
        if (result.success) updated++;
      }

      return res.status(200).json({
        success: true,
        heartbeatsUpdated: updated,
        processingMs: Date.now() - startMs,
      });
    }

    // Handle oracle events
    const eventReq = body as OracleEventRequest;

    // Validate authentication
    if (!validateOracleSignature(req, eventReq)) {
      await writeAuditEvent({
        eventType: 'ADMIN_ACCOUNT_ACTION',
        actorType: 'system',
        reasonCode: 'ORACLE_AUTH_FAILED',
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
        metadata: {
          eventType: eventReq.eventType,
          eventSource: eventReq.eventSource,
          marketId: eventReq.marketId,
        },
      });

      return res.status(401).json({ success: false, error: 'Invalid oracle credentials' });
    }

    // Validate required fields
    if (!eventReq.eventType || !eventReq.eventSource || !eventReq.marketId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventType, eventSource, marketId',
      });
    }

    // Convert to OracleEvent
    const event: OracleEvent = {
      eventType: eventReq.eventType,
      eventSource: eventReq.eventSource,
      eventTsMs: eventReq.eventTsMs || Date.now(),
      marketId: eventReq.marketId,
      payload: eventReq.payload || {},
    };

    // Process the event (this triggers locks as needed)
    const result = await handleOracleEvent(event);

    return res.status(200).json({
      success: true,
      result,
      processingMs: Date.now() - startMs,
    });

  } catch (error) {
    console.error('Oracle event handler error:', error);

    await writeAuditEvent({
      eventType: 'ADMIN_ACCOUNT_ACTION',
      actorType: 'system',
      reasonCode: 'ORACLE_HANDLER_ERROR',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      },
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      processingMs: Date.now() - startMs,
    });
  }
}

// Disable body parsing to handle raw JSON
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
