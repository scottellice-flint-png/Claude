// @ts-nocheck
import prisma from '@/lib/prisma';
import { createAuditLog, getChanges } from './auditService';
import type {
  Market,
  MarketStatus,
  CreateMarketInput,
  UpdateMarketInput,
  MarketVersion,
  MarketApproval,
  MarketResolution,
  CreateResolutionInput,
  CreateApprovalInput,
  PaginatedResponse,
  MarketConstraints,
  MarketRulesStructured,
  MARKET_STATUS_TRANSITIONS,
} from '@/types/admin';

interface MarketFilters {
  status?: MarketStatus;
  categoryId?: string;
  subcategoryId?: string;
  isFeatured?: boolean;
  search?: string;
  createdById?: string;
  assignedToId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'closesAt' | 'title' | 'volume';
  sortOrder?: 'asc' | 'desc';
}

interface AdminContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// MARKET CRUD
// ============================================================================

export async function createMarket(
  input: CreateMarketInput,
  ctx: AdminContext
): Promise<Market> {
  const { outcomes, tagIds, ...marketData } = input;

  const market = await prisma.$transaction(async (tx) => {
    // Create the market
    const newMarket = await tx.market.create({
      data: {
        ...marketData,
        constraints: JSON.stringify(input.constraints || {}),
        rulesStructured: JSON.stringify(input.rulesStructured || {}),
        createdById: ctx.userId,
        currentYesPrice: input.initialYesPrice || 50,
        currentNoPrice: 100 - (input.initialYesPrice || 50),
      },
    });

    // Create outcomes
    if (input.marketType === 'binary' || !input.marketType) {
      // Default binary outcomes
      await tx.marketOutcome.createMany({
        data: [
          {
            marketId: newMarket.id,
            label: 'Yes',
            position: 0,
            initialPrice: input.initialYesPrice || 50,
            currentPrice: input.initialYesPrice || 50,
            color: '#22C55E',
          },
          {
            marketId: newMarket.id,
            label: 'No',
            position: 1,
            initialPrice: 100 - (input.initialYesPrice || 50),
            currentPrice: 100 - (input.initialYesPrice || 50),
            color: '#EF4444',
          },
        ],
      });
    } else if (outcomes && outcomes.length > 0) {
      // Multi-outcome
      await tx.marketOutcome.createMany({
        data: outcomes.map((outcome, index) => ({
          marketId: newMarket.id,
          label: outcome.label,
          displayLabel: outcome.displayLabel,
          description: outcome.description,
          position: outcome.position ?? index,
          initialPrice: outcome.initialPrice || Math.floor(100 / outcomes.length),
          currentPrice: outcome.initialPrice || Math.floor(100 / outcomes.length),
          color: outcome.color,
        })),
      });
    }

    // Add tags
    if (tagIds && tagIds.length > 0) {
      await tx.marketTag.createMany({
        data: tagIds.map((tagId) => ({
          marketId: newMarket.id,
          tagId,
        })),
      });
    }

    // Create initial version
    const fullMarket = await tx.market.findUnique({
      where: { id: newMarket.id },
      include: {
        outcomes: true,
        tags: { include: { tag: true } },
        category: true,
        subcategory: true,
      },
    });

    await tx.marketVersion.create({
      data: {
        marketId: newMarket.id,
        version: 1,
        data: JSON.stringify(fullMarket),
        changeType: 'created',
        changeSummary: 'Market created',
        createdById: ctx.userId,
      },
    });

    // Update market with current version
    await tx.market.update({
      where: { id: newMarket.id },
      data: { currentVersionId: newMarket.id },
    });

    return fullMarket;
  });

  // Create audit log
  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: market!.id,
    action: 'create',
    newData: market as unknown as Record<string, unknown>,
  });

  return formatMarket(market!);
}

export async function getMarket(id: string): Promise<Market | null> {
  const market = await prisma.market.findUnique({
    where: { id },
    include: {
      category: true,
      subcategory: true,
      creator: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      assignee: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      outcomes: { orderBy: { position: 'asc' } },
      tags: { include: { tag: true } },
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
      approvals: {
        orderBy: { approvedAt: 'desc' },
        take: 5,
        include: {
          approvedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
      relatedMarkets: {
        include: {
          relatedMarket: {
            select: { id: true, slug: true, title: true, shortDescription: true, currentYesPrice: true },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      collections: {
        include: {
          collection: {
            select: { id: true, slug: true, name: true },
          },
        },
      },
    },
  });

  if (!market) return null;
  return formatMarket(market);
}

export async function getMarketBySlug(slug: string): Promise<Market | null> {
  const market = await prisma.market.findUnique({
    where: { slug },
    include: {
      category: true,
      subcategory: true,
      outcomes: { orderBy: { position: 'asc' } },
      tags: { include: { tag: true } },
    },
  });

  if (!market) return null;
  return formatMarket(market);
}

export async function getMarkets(
  filters: MarketFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Market>> {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.subcategoryId) {
    where.subcategoryId = filters.subcategoryId;
  }

  if (filters.isFeatured !== undefined) {
    where.isFeatured = filters.isFeatured;
  }

  if (filters.createdById) {
    where.createdById = filters.createdById;
  }

  if (filters.assignedToId) {
    where.assignedToId = filters.assignedToId;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { shortDescription: { contains: filters.search } },
      { slug: { contains: filters.search } },
    ];
  }

  const orderBy: Record<string, 'asc' | 'desc'> = {};
  if (filters.sortBy) {
    orderBy[filters.sortBy] = filters.sortOrder || 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [markets, total] = await Promise.all([
    prisma.market.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true },
        },
        outcomes: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
        _count: {
          select: { versions: true, approvals: true },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.market.count({ where }),
  ]);

  return {
    data: markets.map(formatMarket),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function updateMarket(
  id: string,
  input: UpdateMarketInput,
  ctx: AdminContext
): Promise<Market> {
  const previousMarket = await prisma.market.findUnique({
    where: { id },
    include: {
      outcomes: true,
      tags: { include: { tag: true } },
    },
  });

  if (!previousMarket) {
    throw new Error('Market not found');
  }

  // Get current version number
  const lastVersion = await prisma.marketVersion.findFirst({
    where: { marketId: id },
    orderBy: { version: 'desc' },
  });

  const nextVersion = (lastVersion?.version || 0) + 1;

  const market = await prisma.$transaction(async (tx) => {
    // Update market
    const updated = await tx.market.update({
      where: { id },
      data: {
        ...input,
        constraints: input.constraints ? JSON.stringify(input.constraints) : undefined,
        rulesStructured: input.rulesStructured ? JSON.stringify(input.rulesStructured) : undefined,
      },
      include: {
        category: true,
        subcategory: true,
        outcomes: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    // Determine change type
    let changeType = 'updated';
    if (input.status && input.status !== previousMarket.status) {
      changeType = 'status_changed';
    }

    // Create new version
    await tx.marketVersion.create({
      data: {
        marketId: id,
        version: nextVersion,
        data: JSON.stringify(updated),
        changeType,
        changeSummary: generateChangeSummary(previousMarket, input),
        createdById: ctx.userId,
      },
    });

    return updated;
  });

  // Create audit log
  const changes = getChanges(
    previousMarket as unknown as Record<string, unknown>,
    market as unknown as Record<string, unknown>
  );

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: id,
    action: 'update',
    previousData: previousMarket as unknown as Record<string, unknown>,
    newData: market as unknown as Record<string, unknown>,
    metadata: { changes },
  });

  return formatMarket(market);
}

export async function deleteMarket(id: string, ctx: AdminContext): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  // Only allow deletion of draft markets
  if (market.status !== 'draft') {
    throw new Error('Only draft markets can be deleted');
  }

  await prisma.market.delete({ where: { id } });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: id,
    action: 'delete',
    previousData: market as unknown as Record<string, unknown>,
  });
}

// ============================================================================
// WORKFLOW & STATUS
// ============================================================================

const STATUS_TRANSITIONS: Record<MarketStatus, MarketStatus[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['published', 'review'],
  published: ['trading_halted', 'resolved'],
  trading_halted: ['published', 'resolved'],
  resolved: ['settled', 'published'],
  settled: ['archived'],
  archived: [],
};

export async function transitionMarketStatus(
  id: string,
  toStatus: MarketStatus,
  approval: CreateApprovalInput,
  ctx: AdminContext
): Promise<Market> {
  const market = await prisma.market.findUnique({
    where: { id },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  const currentStatus = market.status as MarketStatus;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(toStatus)) {
    throw new Error(
      `Invalid status transition from ${currentStatus} to ${toStatus}. ` +
      `Allowed transitions: ${allowedTransitions.join(', ')}`
    );
  }

  // Get next version
  const lastVersion = await prisma.marketVersion.findFirst({
    where: { marketId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  const updated = await prisma.$transaction(async (tx) => {
    // Update status
    const updatedMarket = await tx.market.update({
      where: { id },
      data: { status: toStatus },
      include: {
        category: true,
        subcategory: true,
        outcomes: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    // Create approval record
    await tx.marketApproval.create({
      data: {
        marketId: id,
        fromStatus: currentStatus,
        toStatus,
        action: approval.action,
        comments: approval.comments,
        approvedById: ctx.userId,
      },
    });

    // Create version
    await tx.marketVersion.create({
      data: {
        marketId: id,
        version: nextVersion,
        data: JSON.stringify(updatedMarket),
        changeType: 'status_changed',
        changeSummary: `Status changed from ${currentStatus} to ${toStatus}`,
        createdById: ctx.userId,
      },
    });

    return updatedMarket;
  });

  // Audit log
  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: id,
    action: approval.action === 'approved' ? 'approve' : approval.action === 'rejected' ? 'reject' : 'update',
    previousData: { status: currentStatus },
    newData: { status: toStatus },
    metadata: { approval },
  });

  return formatMarket(updated);
}

// ============================================================================
// RESOLUTION
// ============================================================================

export async function resolveMarket(
  id: string,
  resolution: CreateResolutionInput,
  ctx: AdminContext
): Promise<Market> {
  const market = await prisma.market.findUnique({
    where: { id },
    include: { outcomes: true },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  if (!['published', 'trading_halted'].includes(market.status)) {
    throw new Error('Market must be published or trading halted to resolve');
  }

  const lastVersion = await prisma.marketVersion.findFirst({
    where: { marketId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  const updated = await prisma.$transaction(async (tx) => {
    // Update outcome winners
    if (resolution.outcomeId) {
      await tx.marketOutcome.updateMany({
        where: { marketId: id },
        data: { isResolved: true, isWinner: false },
      });
      await tx.marketOutcome.update({
        where: { id: resolution.outcomeId },
        data: { isWinner: true },
      });
    } else {
      // Binary resolution
      const isYes = resolution.resolution.toLowerCase() === 'yes';
      await tx.marketOutcome.updateMany({
        where: { marketId: id, label: 'Yes' },
        data: { isResolved: true, isWinner: isYes },
      });
      await tx.marketOutcome.updateMany({
        where: { marketId: id, label: 'No' },
        data: { isResolved: true, isWinner: !isYes },
      });
    }

    // Update market
    const updatedMarket = await tx.market.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedOutcomeId: resolution.outcomeId,
        resolvedAt: new Date(),
      },
      include: {
        category: true,
        subcategory: true,
        outcomes: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    // Create resolution record
    await tx.marketResolution.create({
      data: {
        marketId: id,
        outcomeId: resolution.outcomeId,
        resolution: resolution.resolution,
        resolutionNotes: resolution.resolutionNotes,
        sourceUrl: resolution.sourceUrl,
        sourceData: resolution.sourceData ? JSON.stringify(resolution.sourceData) : null,
        resolvedById: ctx.userId,
      },
    });

    // Create version
    await tx.marketVersion.create({
      data: {
        marketId: id,
        version: nextVersion,
        data: JSON.stringify(updatedMarket),
        changeType: 'resolved',
        changeSummary: `Market resolved: ${resolution.resolution}`,
        createdById: ctx.userId,
      },
    });

    return updatedMarket;
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: id,
    action: 'resolve',
    newData: resolution as unknown as Record<string, unknown>,
  });

  return formatMarket(updated);
}

export async function settleMarket(id: string, ctx: AdminContext): Promise<Market> {
  const market = await prisma.market.findUnique({
    where: { id },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  if (market.status !== 'resolved') {
    throw new Error('Market must be resolved before settlement');
  }

  const lastVersion = await prisma.marketVersion.findFirst({
    where: { marketId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedMarket = await tx.market.update({
      where: { id },
      data: {
        status: 'settled',
        settledAt: new Date(),
      },
      include: {
        category: true,
        subcategory: true,
        outcomes: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    // Update resolution record
    await tx.marketResolution.updateMany({
      where: { marketId: id },
      data: {
        settlementStatus: 'completed',
        settledAt: new Date(),
      },
    });

    // Create version
    await tx.marketVersion.create({
      data: {
        marketId: id,
        version: nextVersion,
        data: JSON.stringify(updatedMarket),
        changeType: 'settled',
        changeSummary: 'Market settled',
        createdById: ctx.userId,
      },
    });

    return updatedMarket;
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: id,
    action: 'settle',
  });

  return formatMarket(updated);
}

// ============================================================================
// VERSIONING & ROLLBACK
// ============================================================================

export async function getMarketVersions(marketId: string): Promise<MarketVersion[]> {
  const versions = await prisma.marketVersion.findMany({
    where: { marketId },
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { version: 'desc' },
  });

  return versions.map((v) => ({
    id: v.id,
    marketId: v.marketId,
    version: v.version,
    data: JSON.parse(v.data),
    changeType: v.changeType as MarketVersion['changeType'],
    changeSummary: v.changeSummary || undefined,
    createdById: v.createdById,
    createdAt: v.createdAt.toISOString(),
    createdBy: v.createdBy as MarketVersion['createdBy'],
  }));
}

export async function rollbackMarket(
  marketId: string,
  versionId: string,
  ctx: AdminContext
): Promise<Market> {
  const version = await prisma.marketVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.marketId !== marketId) {
    throw new Error('Version not found');
  }

  const versionData = JSON.parse(version.data);

  const lastVersion = await prisma.marketVersion.findFirst({
    where: { marketId },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  const updated = await prisma.$transaction(async (tx) => {
    // Restore market data (excluding relations and computed fields)
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      category: _category,
      subcategory: _subcategory,
      outcomes: _outcomes,
      tags: _tags,
      versions: _versions,
      approvals: _approvals,
      creator: _creator,
      assignee: _assignee,
      ...restoreData
    } = versionData;

    const updatedMarket = await tx.market.update({
      where: { id: marketId },
      data: restoreData,
      include: {
        category: true,
        subcategory: true,
        outcomes: { orderBy: { position: 'asc' } },
        tags: { include: { tag: true } },
      },
    });

    // Create rollback version
    await tx.marketVersion.create({
      data: {
        marketId,
        version: nextVersion,
        data: JSON.stringify(updatedMarket),
        changeType: 'rolled_back',
        changeSummary: `Rolled back to version ${version.version}`,
        createdById: ctx.userId,
      },
    });

    return updatedMarket;
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'market',
    entityId: marketId,
    action: 'rollback',
    metadata: { rolledBackToVersion: version.version },
  });

  return formatMarket(updated);
}

// ============================================================================
// RELATED MARKETS & TAGS
// ============================================================================

export async function addRelatedMarket(
  marketId: string,
  relatedMarketId: string,
  relationType: string = 'related',
  displayOrder: number = 0,
  ctx: AdminContext
): Promise<void> {
  await prisma.marketRelation.create({
    data: {
      sourceMarketId: marketId,
      relatedMarketId,
      relationType,
      displayOrder,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    entityType: 'market',
    entityId: marketId,
    action: 'update',
    metadata: { addedRelatedMarket: relatedMarketId },
  });
}

export async function removeRelatedMarket(
  marketId: string,
  relatedMarketId: string,
  ctx: AdminContext
): Promise<void> {
  await prisma.marketRelation.deleteMany({
    where: {
      sourceMarketId: marketId,
      relatedMarketId,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    entityType: 'market',
    entityId: marketId,
    action: 'update',
    metadata: { removedRelatedMarket: relatedMarketId },
  });
}

export async function updateMarketTags(
  marketId: string,
  tagIds: string[],
  ctx: AdminContext
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Remove existing tags
    await tx.marketTag.deleteMany({
      where: { marketId },
    });

    // Add new tags
    if (tagIds.length > 0) {
      await tx.marketTag.createMany({
        data: tagIds.map((tagId) => ({
          marketId,
          tagId,
        })),
      });
    }
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    entityType: 'market',
    entityId: marketId,
    action: 'update',
    metadata: { updatedTags: tagIds },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMarket(market: Record<string, unknown>): Market {
  return {
    ...market,
    constraints: market.constraints ? JSON.parse(market.constraints as string) : {},
    rulesStructured: market.rulesStructured ? JSON.parse(market.rulesStructured as string) : {},
    opensAt: market.opensAt ? (market.opensAt as Date).toISOString() : undefined,
    closesAt: (market.closesAt as Date).toISOString(),
    resolvesBy: (market.resolvesBy as Date).toISOString(),
    settlesBy: (market.settlesBy as Date).toISOString(),
    resolvedAt: market.resolvedAt ? (market.resolvedAt as Date).toISOString() : undefined,
    settledAt: market.settledAt ? (market.settledAt as Date).toISOString() : undefined,
    createdAt: (market.createdAt as Date).toISOString(),
    updatedAt: (market.updatedAt as Date).toISOString(),
    outcomes: (market.outcomes as unknown[])?.map((o: Record<string, unknown>) => ({
      ...o,
      createdAt: (o.createdAt as Date).toISOString(),
      updatedAt: (o.updatedAt as Date).toISOString(),
    })),
    tags: market.tags,
    versions: market.versions,
    approvals: market.approvals,
    relatedMarkets: market.relatedMarkets,
    collections: market.collections,
  } as Market;
}

function generateChangeSummary(
  previous: Record<string, unknown>,
  changes: UpdateMarketInput
): string {
  const changedFields = Object.keys(changes).filter(
    (key) => changes[key as keyof UpdateMarketInput] !== undefined
  );

  if (changedFields.length === 0) return 'No changes';
  if (changedFields.length === 1) return `Updated ${changedFields[0]}`;
  if (changedFields.length <= 3) return `Updated ${changedFields.join(', ')}`;
  return `Updated ${changedFields.length} fields`;
}
