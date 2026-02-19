/**
 * Audit Event Service Tests
 *
 * Tests for the comprehensive audit logging system including:
 * - Event creation and validation
 * - Monotonic sequence ordering
 * - Hash chain integrity
 * - Admin events require reason codes
 * - Market snapshot reconstruction
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Prisma client
const mockPrismaAuditEvent = {
  create: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockPrismaSystemSequence = {
  upsert: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    auditEvent: mockPrismaAuditEvent,
    systemSequence: mockPrismaSystemSequence,
  },
}));

// Import after mocking
import {
  writeAuditEvent,
  getAuditEvents,
  reconstructMarketSnapshot,
  verifyHashChain,
} from '@/services/auditEventService';
import type { AuditEventInput } from '@/types/auditEvents';

describe('Audit Event Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockPrismaSystemSequence.upsert.mockResolvedValue({ lastSeq: BigInt(1) });
    mockPrismaAuditEvent.findFirst.mockResolvedValue(null);
    mockPrismaAuditEvent.create.mockImplementation(async (args) => ({
      id: 'test-event-id',
      occurredAt: new Date(),
      occurredAtMs: BigInt(Date.now()),
      seq: BigInt(1),
      eventType: args.data.eventType,
      actorType: args.data.actorType,
      actorId: args.data.actorId,
      marketId: args.data.marketId,
      reasonCode: args.data.reasonCode,
      beforeState: args.data.beforeState,
      afterState: args.data.afterState,
      metadata: args.data.metadata,
      integrityHash: args.data.integrityHash,
      previousHash: args.data.previousHash,
      createdAt: new Date(),
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('writeAuditEvent', () => {
    it('should create an audit event with all required fields', async () => {
      const input: AuditEventInput = {
        eventType: 'MARKET_CREATED',
        actorType: 'admin',
        actorId: 'admin-123',
        marketId: 'market-456',
        afterState: { status: 'draft' },
      };

      const result = await writeAuditEvent(input);

      expect(result).toBeDefined();
      expect(result.eventType).toBe('MARKET_CREATED');
      expect(result.actorType).toBe('admin');
      expect(result.marketId).toBe('market-456');
      expect(mockPrismaAuditEvent.create).toHaveBeenCalledTimes(1);
    });

    it('should generate monotonically increasing sequence numbers', async () => {
      let seqCounter = BigInt(0);
      mockPrismaSystemSequence.upsert.mockImplementation(async () => {
        seqCounter++;
        return { lastSeq: seqCounter };
      });

      const input: AuditEventInput = {
        eventType: 'MARKET_CREATED',
        actorType: 'admin',
        actorId: 'admin-123',
        marketId: 'market-456',
      };

      // Create multiple events
      await writeAuditEvent(input);
      await writeAuditEvent(input);
      await writeAuditEvent(input);

      expect(mockPrismaSystemSequence.upsert).toHaveBeenCalledTimes(3);
    });

    it('should generate integrity hash for events', async () => {
      const input: AuditEventInput = {
        eventType: 'MARKET_CREATED',
        actorType: 'admin',
        actorId: 'admin-123',
        marketId: 'market-456',
        afterState: { status: 'draft' },
      };

      await writeAuditEvent(input);

      const createCall = mockPrismaAuditEvent.create.mock.calls[0][0];
      expect(createCall.data.integrityHash).toBeDefined();
      expect(typeof createCall.data.integrityHash).toBe('string');
      expect(createCall.data.integrityHash.length).toBe(64); // SHA-256 hex length
    });

    it('should chain hashes by referencing previous hash', async () => {
      mockPrismaAuditEvent.findFirst.mockResolvedValue({
        integrityHash: 'previous-hash-abc123',
      });

      const input: AuditEventInput = {
        eventType: 'MARKET_UPDATED',
        actorType: 'admin',
        actorId: 'admin-123',
        marketId: 'market-456',
      };

      await writeAuditEvent(input);

      const createCall = mockPrismaAuditEvent.create.mock.calls[0][0];
      expect(createCall.data.previousHash).toBe('previous-hash-abc123');
    });

    it('should require reason code for admin suspension events', async () => {
      const input: AuditEventInput = {
        eventType: 'ADMIN_MARKET_SUSPENDED',
        actorType: 'admin',
        actorId: 'admin-123',
        marketId: 'market-456',
        // Missing reasonCode
      };

      await expect(writeAuditEvent(input)).rejects.toThrow(
        /requires a reason code/
      );
    });

    it('should require reason code for admin balance adjustment', async () => {
      const input: AuditEventInput = {
        eventType: 'ADMIN_BALANCE_ADJUSTMENT',
        actorType: 'admin',
        actorId: 'admin-123',
        // Missing reasonCode
      };

      await expect(writeAuditEvent(input)).rejects.toThrow(
        /requires a reason code/
      );
    });

    it('should accept valid admin events with reason code', async () => {
      const input: AuditEventInput = {
        eventType: 'ADMIN_MARKET_SUSPENDED',
        actorType: 'admin',
        actorId: 'admin-123',
        marketId: 'market-456',
        reasonCode: 'COMPLIANCE_REVIEW',
        beforeState: { status: 'published' },
        afterState: { status: 'trading_halted' },
      };

      const result = await writeAuditEvent(input);

      expect(result).toBeDefined();
      expect(result.reasonCode).toBe('COMPLIANCE_REVIEW');
    });

    it('should require marketId for market events', async () => {
      const input: AuditEventInput = {
        eventType: 'MARKET_CREATED',
        actorType: 'admin',
        actorId: 'admin-123',
        // Missing marketId
      };

      await expect(writeAuditEvent(input)).rejects.toThrow(
        /requires a market ID/
      );
    });

    it('should auto-populate timestamp in milliseconds', async () => {
      const beforeTime = Date.now();

      const input: AuditEventInput = {
        eventType: 'USER_LOGIN_SUCCESS',
        actorType: 'user',
        actorId: 'user-123',
      };

      await writeAuditEvent(input);

      const afterTime = Date.now();
      const createCall = mockPrismaAuditEvent.create.mock.calls[0][0];
      const occurredAtMs = Number(createCall.data.occurredAtMs);

      expect(occurredAtMs).toBeGreaterThanOrEqual(beforeTime);
      expect(occurredAtMs).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getAuditEvents', () => {
    it('should return paginated results', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          occurredAt: new Date(),
          occurredAtMs: BigInt(Date.now()),
          seq: BigInt(1),
          eventType: 'MARKET_CREATED',
          actorType: 'admin',
          createdAt: new Date(),
        },
      ]);
      mockPrismaAuditEvent.count.mockResolvedValue(100);

      const result = await getAuditEvents({}, 1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by marketId', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([]);
      mockPrismaAuditEvent.count.mockResolvedValue(0);

      await getAuditEvents({ marketId: 'market-123' });

      const findManyCall = mockPrismaAuditEvent.findMany.mock.calls[0][0];
      expect(findManyCall.where.marketId).toBe('market-123');
    });

    it('should filter by event types', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([]);
      mockPrismaAuditEvent.count.mockResolvedValue(0);

      await getAuditEvents({ eventTypes: ['MARKET_CREATED', 'MARKET_UPDATED'] });

      const findManyCall = mockPrismaAuditEvent.findMany.mock.calls[0][0];
      expect(findManyCall.where.eventType.in).toEqual(['MARKET_CREATED', 'MARKET_UPDATED']);
    });

    it('should filter by time range', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([]);
      mockPrismaAuditEvent.count.mockResolvedValue(0);

      const startTime = '2024-01-01T00:00:00Z';
      const endTime = '2024-12-31T23:59:59Z';

      await getAuditEvents({ startTime, endTime });

      const findManyCall = mockPrismaAuditEvent.findMany.mock.calls[0][0];
      expect(findManyCall.where.occurredAt.gte).toEqual(new Date(startTime));
      expect(findManyCall.where.occurredAt.lte).toEqual(new Date(endTime));
    });
  });

  describe('reconstructMarketSnapshot', () => {
    it('should reconstruct market state from events', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          seq: BigInt(1),
          eventType: 'MARKET_CREATED',
          afterState: JSON.stringify({
            status: 'draft',
            currentYesPrice: 50,
            currentNoPrice: 50,
            volume: 0,
            liquidity: 1000,
            tradeCount: 0,
            outcomes: [
              { id: 'o1', label: 'Yes', currentPrice: 50, isResolved: false, isWinner: false },
              { id: 'o2', label: 'No', currentPrice: 50, isResolved: false, isWinner: false },
            ],
          }),
        },
        {
          id: 'event-2',
          seq: BigInt(2),
          eventType: 'MARKET_PUBLISHED',
          afterState: JSON.stringify({
            status: 'published',
            currentYesPrice: 50,
            currentNoPrice: 50,
            volume: 0,
            liquidity: 1000,
          }),
        },
        {
          id: 'event-3',
          seq: BigInt(3),
          eventType: 'AMM_STATE_CHANGED',
          afterState: JSON.stringify({
            currentYesPrice: 65,
            volume: 500,
            liquidity: 1200,
            tradeCount: 5,
          }),
        },
      ]);

      const snapshot = await reconstructMarketSnapshot(
        'market-123',
        new Date()
      );

      expect(snapshot).toBeDefined();
      expect(snapshot!.status).toBe('published');
      expect(snapshot!.currentYesPrice).toBe(65);
      expect(snapshot!.volume).toBe(500);
      expect(snapshot!.tradeCount).toBe(5);
    });

    it('should return null when no events exist', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([]);

      const snapshot = await reconstructMarketSnapshot(
        'nonexistent-market',
        new Date()
      );

      expect(snapshot).toBeNull();
    });

    it('should reconstruct resolved market state', async () => {
      mockPrismaAuditEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          seq: BigInt(1),
          eventType: 'MARKET_CREATED',
          afterState: JSON.stringify({
            status: 'draft',
            currentYesPrice: 50,
            outcomes: [
              { id: 'o1', label: 'Yes', currentPrice: 50, isResolved: false, isWinner: false },
            ],
          }),
        },
        {
          id: 'event-2',
          seq: BigInt(2),
          eventType: 'MARKET_RESOLVED',
          afterState: JSON.stringify({
            status: 'resolved',
            resolvedOutcomeId: 'o1',
            resolvedAt: '2024-06-15T12:00:00Z',
            outcomes: [
              { id: 'o1', label: 'Yes', currentPrice: 100, isResolved: true, isWinner: true },
            ],
          }),
        },
      ]);

      const snapshot = await reconstructMarketSnapshot(
        'market-123',
        new Date()
      );

      expect(snapshot!.status).toBe('resolved');
      expect(snapshot!.resolvedOutcomeId).toBe('o1');
      expect(snapshot!.resolvedAt).toBe('2024-06-15T12:00:00Z');
    });
  });

  describe('verifyHashChain', () => {
    it('should verify valid hash chain', async () => {
      // Create a valid hash chain
      const events = [
        {
          id: 'event-1',
          seq: BigInt(1),
          eventType: 'MARKET_CREATED',
          occurredAtMs: BigInt(1000),
          actorType: 'admin',
          actorId: null,
          marketId: 'market-1',
          betId: null,
          orderId: null,
          reasonCode: null,
          beforeState: null,
          afterState: JSON.stringify({ status: 'draft' }),
          metadata: null,
          integrityHash: 'hash-1',
          previousHash: null,
        },
      ];

      mockPrismaAuditEvent.findMany.mockResolvedValue(events);

      const result = await verifyHashChain();

      expect(result.valid).toBe(true);
      expect(result.totalVerified).toBe(1);
    });

    it('should detect broken hash chain', async () => {
      const events = [
        {
          id: 'event-1',
          seq: BigInt(1),
          eventType: 'MARKET_CREATED',
          occurredAtMs: BigInt(1000),
          actorType: 'admin',
          actorId: null,
          marketId: 'market-1',
          betId: null,
          orderId: null,
          reasonCode: null,
          beforeState: null,
          afterState: null,
          metadata: null,
          integrityHash: 'hash-1',
          previousHash: null,
        },
        {
          id: 'event-2',
          seq: BigInt(2),
          eventType: 'MARKET_UPDATED',
          occurredAtMs: BigInt(2000),
          actorType: 'admin',
          actorId: null,
          marketId: 'market-1',
          betId: null,
          orderId: null,
          reasonCode: null,
          beforeState: null,
          afterState: null,
          metadata: null,
          integrityHash: 'hash-2',
          previousHash: 'wrong-hash', // Should be 'hash-1'
        },
      ];

      mockPrismaAuditEvent.findMany.mockResolvedValue(events);

      const result = await verifyHashChain();

      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe('event-2');
    });

    it('should skip events without hash', async () => {
      const events = [
        {
          id: 'event-1',
          seq: BigInt(1),
          eventType: 'MARKET_CREATED',
          occurredAtMs: BigInt(1000),
          actorType: 'admin',
          actorId: null,
          marketId: 'market-1',
          betId: null,
          orderId: null,
          reasonCode: null,
          beforeState: null,
          afterState: null,
          metadata: null,
          integrityHash: null, // No hash
          previousHash: null,
        },
      ];

      mockPrismaAuditEvent.findMany.mockResolvedValue(events);

      const result = await verifyHashChain();

      expect(result.valid).toBe(true);
      expect(result.totalVerified).toBe(0);
    });
  });

  describe('Event Type Validation', () => {
    const testCases = [
      { eventType: 'USER_LOGIN_SUCCESS', actorType: 'user', shouldPass: true },
      { eventType: 'ADMIN_LOGIN_SUCCESS', actorType: 'admin', shouldPass: true },
      { eventType: 'DEPLOYMENT_RECORDED', actorType: 'system', shouldPass: true },
      { eventType: 'INVALID_EVENT_TYPE', actorType: 'user', shouldPass: false },
    ];

    testCases.forEach(({ eventType, actorType, shouldPass }) => {
      it(`should ${shouldPass ? 'accept' : 'reject'} ${eventType}`, async () => {
        const input: AuditEventInput = {
          eventType: eventType as any,
          actorType: actorType as any,
          actorId: 'test-123',
        };

        if (shouldPass) {
          await expect(writeAuditEvent(input)).resolves.toBeDefined();
        } else {
          await expect(writeAuditEvent(input)).rejects.toThrow(/Unknown event type/);
        }
      });
    });
  });
});
