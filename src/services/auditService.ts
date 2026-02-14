// @ts-nocheck
import prisma from '@/lib/prisma';
import type { AuditAction, EntityType, AuditLog, AuditLogFilters, PaginatedResponse } from '@/types/admin';

interface AuditLogCreateInput {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  entityType: EntityType;
  entityId?: string;
  action: AuditAction;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Create an audit log entry
export async function createAuditLog(input: AuditLogCreateInput): Promise<AuditLog> {
  const log = await prisma.auditLog.create({
    data: {
      userId: input.userId,
      userEmail: input.userEmail,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      previousData: input.previousData ? JSON.stringify(input.previousData) : null,
      newData: input.newData ? JSON.stringify(input.newData) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return formatAuditLog(log);
}

// Get audit logs with filters and pagination
export async function getAuditLogs(
  filters: AuditLogFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<AuditLog>> {
  const where: Record<string, unknown> = {};

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }

  if (filters.entityId) {
    where.entityId = filters.entityId;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(filters.endDate);
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map(formatAuditLog),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// Get audit logs for a specific entity
export async function getEntityAuditLogs(
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(formatAuditLog);
}

// Format audit log from Prisma to our type
function formatAuditLog(log: Record<string, unknown>): AuditLog {
  return {
    id: log.id as string,
    userId: log.userId as string | undefined,
    userEmail: log.userEmail as string | undefined,
    ipAddress: log.ipAddress as string | undefined,
    userAgent: log.userAgent as string | undefined,
    entityType: log.entityType as EntityType,
    entityId: log.entityId as string | undefined,
    action: log.action as AuditAction,
    previousData: log.previousData ? JSON.parse(log.previousData as string) : undefined,
    newData: log.newData ? JSON.parse(log.newData as string) : undefined,
    metadata: log.metadata ? JSON.parse(log.metadata as string) : undefined,
    createdAt: (log.createdAt as Date).toISOString(),
    user: log.user as AuditLog['user'],
  };
}

// Helper to track changes between two objects
export function getChanges(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): { field: string; from: unknown; to: unknown }[] {
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const key of allKeys) {
    const prevValue = previous[key];
    const currValue = current[key];

    if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
      changes.push({
        field: key,
        from: prevValue,
        to: currValue,
      });
    }
  }

  return changes;
}
