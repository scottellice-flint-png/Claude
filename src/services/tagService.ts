import prisma from '@/lib/prisma';
import { createAuditLog } from './auditService';
import type { Tag, CreateTagInput } from '@/types/admin';

interface AdminContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createTag(input: CreateTagInput, ctx: AdminContext): Promise<Tag> {
  const tag = await prisma.tag.create({
    data: input,
    include: {
      _count: { select: { markets: true } },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'tag',
    entityId: tag.id,
    action: 'create',
    newData: tag as unknown as Record<string, unknown>,
  });

  return formatTag(tag);
}

export async function getTag(id: string): Promise<Tag | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: { select: { markets: true } },
    },
  });

  if (!tag) return null;
  return formatTag(tag);
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      _count: { select: { markets: true } },
    },
  });

  if (!tag) return null;
  return formatTag(tag);
}

export async function getTags(): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { markets: true } },
    },
    orderBy: { name: 'asc' },
  });

  return tags.map(formatTag);
}

export async function searchTags(query: string, limit: number = 10): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { slug: { contains: query } },
      ],
    },
    include: {
      _count: { select: { markets: true } },
    },
    orderBy: { name: 'asc' },
    take: limit,
  });

  return tags.map(formatTag);
}

export async function updateTag(
  id: string,
  input: Partial<CreateTagInput>,
  ctx: AdminContext
): Promise<Tag> {
  const previous = await prisma.tag.findUnique({ where: { id } });

  const tag = await prisma.tag.update({
    where: { id },
    data: input,
    include: {
      _count: { select: { markets: true } },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'tag',
    entityId: id,
    action: 'update',
    previousData: previous as unknown as Record<string, unknown>,
    newData: tag as unknown as Record<string, unknown>,
  });

  return formatTag(tag);
}

export async function deleteTag(id: string, ctx: AdminContext): Promise<void> {
  const tag = await prisma.tag.findUnique({
    where: { id },
  });

  if (!tag) {
    throw new Error('Tag not found');
  }

  // Remove tag associations first
  await prisma.marketTag.deleteMany({
    where: { tagId: id },
  });

  await prisma.tag.delete({ where: { id } });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'tag',
    entityId: id,
    action: 'delete',
    previousData: tag as unknown as Record<string, unknown>,
  });
}

function formatTag(tag: Record<string, unknown>): Tag {
  return {
    ...tag,
    createdAt: (tag.createdAt as Date).toISOString(),
    updatedAt: (tag.updatedAt as Date).toISOString(),
  } as Tag;
}
