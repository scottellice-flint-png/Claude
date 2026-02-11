import prisma from '@/lib/prisma';
import { createAuditLog } from './auditService';
import type {
  Category,
  Subcategory,
  CreateCategoryInput,
  CreateSubcategoryInput,
} from '@/types/admin';

interface AdminContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function createCategory(
  input: CreateCategoryInput,
  ctx: AdminContext
): Promise<Category> {
  const category = await prisma.category.create({
    data: input,
    include: {
      subcategories: true,
      _count: { select: { markets: true } },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'category',
    entityId: category.id,
    action: 'create',
    newData: category as unknown as Record<string, unknown>,
  });

  return formatCategory(category);
}

export async function getCategory(id: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      subcategories: { orderBy: { displayOrder: 'asc' } },
      _count: { select: { markets: true } },
    },
  });

  if (!category) return null;
  return formatCategory(category);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      subcategories: { orderBy: { displayOrder: 'asc' } },
      _count: { select: { markets: true } },
    },
  });

  if (!category) return null;
  return formatCategory(category);
}

export async function getCategories(includeInactive: boolean = false): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      subcategories: {
        where: includeInactive ? {} : { isActive: true },
        orderBy: { displayOrder: 'asc' },
      },
      _count: { select: { markets: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });

  return categories.map(formatCategory);
}

export async function updateCategory(
  id: string,
  input: Partial<CreateCategoryInput>,
  ctx: AdminContext
): Promise<Category> {
  const previous = await prisma.category.findUnique({ where: { id } });

  const category = await prisma.category.update({
    where: { id },
    data: input,
    include: {
      subcategories: { orderBy: { displayOrder: 'asc' } },
      _count: { select: { markets: true } },
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'category',
    entityId: id,
    action: 'update',
    previousData: previous as unknown as Record<string, unknown>,
    newData: category as unknown as Record<string, unknown>,
  });

  return formatCategory(category);
}

export async function deleteCategory(id: string, ctx: AdminContext): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { markets: true } } },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  if (category._count.markets > 0) {
    throw new Error('Cannot delete category with existing markets');
  }

  await prisma.category.delete({ where: { id } });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'category',
    entityId: id,
    action: 'delete',
    previousData: category as unknown as Record<string, unknown>,
  });
}

// ============================================================================
// SUBCATEGORIES
// ============================================================================

export async function createSubcategory(
  input: CreateSubcategoryInput,
  ctx: AdminContext
): Promise<Subcategory> {
  const subcategory = await prisma.subcategory.create({
    data: input,
    include: { category: true },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'subcategory',
    entityId: subcategory.id,
    action: 'create',
    newData: subcategory as unknown as Record<string, unknown>,
  });

  return formatSubcategory(subcategory);
}

export async function getSubcategory(id: string): Promise<Subcategory | null> {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!subcategory) return null;
  return formatSubcategory(subcategory);
}

export async function getSubcategoriesByCategory(categoryId: string): Promise<Subcategory[]> {
  const subcategories = await prisma.subcategory.findMany({
    where: { categoryId },
    include: { category: true },
    orderBy: { displayOrder: 'asc' },
  });

  return subcategories.map(formatSubcategory);
}

export async function updateSubcategory(
  id: string,
  input: Partial<Omit<CreateSubcategoryInput, 'categoryId'>>,
  ctx: AdminContext
): Promise<Subcategory> {
  const previous = await prisma.subcategory.findUnique({ where: { id } });

  const subcategory = await prisma.subcategory.update({
    where: { id },
    data: input,
    include: { category: true },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'subcategory',
    entityId: id,
    action: 'update',
    previousData: previous as unknown as Record<string, unknown>,
    newData: subcategory as unknown as Record<string, unknown>,
  });

  return formatSubcategory(subcategory);
}

export async function deleteSubcategory(id: string, ctx: AdminContext): Promise<void> {
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
  });

  if (!subcategory) {
    throw new Error('Subcategory not found');
  }

  // Check if any markets use this subcategory
  const marketCount = await prisma.market.count({
    where: { subcategoryId: id },
  });

  if (marketCount > 0) {
    throw new Error('Cannot delete subcategory with existing markets');
  }

  await prisma.subcategory.delete({ where: { id } });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'subcategory',
    entityId: id,
    action: 'delete',
    previousData: subcategory as unknown as Record<string, unknown>,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCategory(category: Record<string, unknown>): Category {
  return {
    ...category,
    createdAt: (category.createdAt as Date).toISOString(),
    updatedAt: (category.updatedAt as Date).toISOString(),
    subcategories: (category.subcategories as unknown[])?.map(formatSubcategory),
  } as Category;
}

function formatSubcategory(subcategory: Record<string, unknown>): Subcategory {
  return {
    ...subcategory,
    createdAt: (subcategory.createdAt as Date).toISOString(),
    updatedAt: (subcategory.updatedAt as Date).toISOString(),
  } as Subcategory;
}
