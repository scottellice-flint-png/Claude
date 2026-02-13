// @ts-nocheck
import prisma from '@/lib/prisma';
import { createAuditLog } from './auditService';
import type {
  MarketCollection,
  CreateCollectionInput,
  UpdateCollectionInput,
  PaginatedResponse,
} from '@/types/admin';

interface AdminContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createCollection(
  input: CreateCollectionInput,
  ctx: AdminContext
): Promise<MarketCollection> {
  const { marketIds, ...collectionData } = input;

  const collection = await prisma.$transaction(async (tx) => {
    const newCollection = await tx.marketCollection.create({
      data: collectionData,
    });

    if (marketIds && marketIds.length > 0) {
      await tx.marketCollectionItem.createMany({
        data: marketIds.map((marketId, index) => ({
          collectionId: newCollection.id,
          marketId,
          displayOrder: index,
        })),
      });
    }

    return tx.marketCollection.findUnique({
      where: { id: newCollection.id },
      include: {
        markets: {
          include: {
            market: {
              select: {
                id: true,
                slug: true,
                title: true,
                shortDescription: true,
                currentYesPrice: true,
                status: true,
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: { select: { markets: true } },
      },
    });
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'collection',
    entityId: collection!.id,
    action: 'create',
    newData: collection as unknown as Record<string, unknown>,
  });

  return formatCollection(collection!);
}

export async function getCollection(id: string): Promise<MarketCollection | null> {
  const collection = await prisma.marketCollection.findUnique({
    where: { id },
    include: {
      markets: {
        include: {
          market: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              currentYesPrice: true,
              status: true,
              cardImageUrl: true,
              icon: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { markets: true } },
    },
  });

  if (!collection) return null;
  return formatCollection(collection);
}

export async function getCollectionBySlug(slug: string): Promise<MarketCollection | null> {
  const collection = await prisma.marketCollection.findUnique({
    where: { slug },
    include: {
      markets: {
        include: {
          market: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              currentYesPrice: true,
              status: true,
              cardImageUrl: true,
              icon: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { markets: true } },
    },
  });

  if (!collection) return null;
  return formatCollection(collection);
}

export async function getCollections(
  includeInactive: boolean = false,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<MarketCollection>> {
  const where = includeInactive ? {} : { isActive: true };

  const [collections, total] = await Promise.all([
    prisma.marketCollection.findMany({
      where,
      include: {
        markets: {
          include: {
            market: {
              select: {
                id: true,
                slug: true,
                title: true,
                shortDescription: true,
                currentYesPrice: true,
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
          take: 5, // Only show first 5 markets in list view
        },
        _count: { select: { markets: true } },
      },
      orderBy: { displayOrder: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketCollection.count({ where }),
  ]);

  return {
    data: collections.map(formatCollection),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getFeaturedCollections(): Promise<MarketCollection[]> {
  const collections = await prisma.marketCollection.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    include: {
      markets: {
        include: {
          market: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              currentYesPrice: true,
              cardImageUrl: true,
              icon: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { markets: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });

  return collections.map(formatCollection);
}

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
  ctx: AdminContext
): Promise<MarketCollection> {
  const previous = await prisma.marketCollection.findUnique({ where: { id } });

  const collection = await prisma.marketCollection.update({
    where: { id },
    data: input,
    include: {
      markets: {
        include: {
          market: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              currentYesPrice: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { markets: true } },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'collection',
    entityId: id,
    action: 'update',
    previousData: previous as unknown as Record<string, unknown>,
    newData: collection as unknown as Record<string, unknown>,
  });

  return formatCollection(collection);
}

export async function deleteCollection(id: string, ctx: AdminContext): Promise<void> {
  const collection = await prisma.marketCollection.findUnique({
    where: { id },
  });

  if (!collection) {
    throw new Error('Collection not found');
  }

  await prisma.marketCollection.delete({ where: { id } });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'collection',
    entityId: id,
    action: 'delete',
    previousData: collection as unknown as Record<string, unknown>,
  });
}

// ============================================================================
// COLLECTION MARKET MANAGEMENT
// ============================================================================

export async function addMarketToCollection(
  collectionId: string,
  marketId: string,
  displayOrder?: number,
  ctx?: AdminContext
): Promise<void> {
  // Get current max order if not provided
  if (displayOrder === undefined) {
    const maxOrder = await prisma.marketCollectionItem.findFirst({
      where: { collectionId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    displayOrder = (maxOrder?.displayOrder ?? -1) + 1;
  }

  await prisma.marketCollectionItem.create({
    data: {
      collectionId,
      marketId,
      displayOrder,
    },
  });

  if (ctx) {
    await createAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      entityType: 'collection',
      entityId: collectionId,
      action: 'update',
      metadata: { addedMarket: marketId },
    });
  }
}

export async function removeMarketFromCollection(
  collectionId: string,
  marketId: string,
  ctx?: AdminContext
): Promise<void> {
  await prisma.marketCollectionItem.deleteMany({
    where: {
      collectionId,
      marketId,
    },
  });

  if (ctx) {
    await createAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      entityType: 'collection',
      entityId: collectionId,
      action: 'update',
      metadata: { removedMarket: marketId },
    });
  }
}

export async function reorderCollectionMarkets(
  collectionId: string,
  marketIds: string[],
  ctx?: AdminContext
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update each market's display order
    for (let i = 0; i < marketIds.length; i++) {
      await tx.marketCollectionItem.updateMany({
        where: {
          collectionId,
          marketId: marketIds[i],
        },
        data: {
          displayOrder: i,
        },
      });
    }
  });

  if (ctx) {
    await createAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      entityType: 'collection',
      entityId: collectionId,
      action: 'update',
      metadata: { reorderedMarkets: marketIds },
    });
  }
}

export async function setCollectionMarkets(
  collectionId: string,
  marketIds: string[],
  ctx: AdminContext
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Remove all existing
    await tx.marketCollectionItem.deleteMany({
      where: { collectionId },
    });

    // Add new ones
    if (marketIds.length > 0) {
      await tx.marketCollectionItem.createMany({
        data: marketIds.map((marketId, index) => ({
          collectionId,
          marketId,
          displayOrder: index,
        })),
      });
    }
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    entityType: 'collection',
    entityId: collectionId,
    action: 'update',
    metadata: { setMarkets: marketIds },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCollection(collection: Record<string, unknown>): MarketCollection {
  return {
    ...collection,
    createdAt: (collection.createdAt as Date).toISOString(),
    updatedAt: (collection.updatedAt as Date).toISOString(),
    markets: (collection.markets as unknown[])?.map((item: Record<string, unknown>) => ({
      ...item,
      createdAt: (item.createdAt as Date).toISOString(),
    })),
  } as MarketCollection;
}
