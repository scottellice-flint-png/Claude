import { z } from 'zod';

// ============================================================================
// MARKET CONSTRAINTS SCHEMA
// ============================================================================

export const marketConstraintsSchema = z.object({
  minTradeAmount: z.number().min(0).optional(),
  maxTradeAmount: z.number().min(0).optional(),
  maxPositionSize: z.number().min(0).optional(),
  maxNotionalExposure: z.number().min(0).optional(),
  jurisdictionEligibility: z.array(z.string()).optional(),
  excludedJurisdictions: z.array(z.string()).optional(),
  kycRequired: z.boolean().optional(),
  kycLevel: z.enum(['basic', 'enhanced', 'full']).optional(),
  allowedUserTypes: z.array(z.string()).optional(),
  noveltyCapEnabled: z.boolean().optional(),
  noveltyCapAmount: z.number().min(0).optional(),
  tradingHoursEnabled: z.boolean().optional(),
  tradingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  tradingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  tradingDays: z.array(z.number().min(0).max(6)).optional(),
  marginRequirement: z.number().min(0).max(100).optional(),
  feeStructure: z.enum(['standard', 'reduced', 'premium']).optional(),
}).strict();

// ============================================================================
// STRUCTURED RULES SCHEMA
// ============================================================================

export const marketRulesStructuredSchema = z.object({
  resolutionCriteria: z.array(z.string()).optional(),
  voidConditions: z.array(z.string()).optional(),
  tieBreakers: z.array(z.string()).optional(),
  edgeCases: z.array(z.object({
    scenario: z.string(),
    resolution: z.string(),
  })).optional(),
  dataSourcePriority: z.array(z.string()).optional(),
  resolutionTimeframe: z.string().optional(),
  amendmentPolicy: z.string().optional(),
}).strict();

// ============================================================================
// OUTCOME SCHEMA
// ============================================================================

export const createOutcomeSchema = z.object({
  label: z.string().min(1).max(100),
  displayLabel: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  position: z.number().min(0).optional(),
  initialPrice: z.number().min(1).max(99).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const updateOutcomeSchema = createOutcomeSchema.partial().extend({
  currentPrice: z.number().min(1).max(99).optional(),
  isResolved: z.boolean().optional(),
  isWinner: z.boolean().optional(),
});

// ============================================================================
// MARKET SCHEMAS
// ============================================================================

export const createMarketSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(5).max(300),
  shortDescription: z.string().min(10).max(300),
  description: z.string().min(20).max(10000),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  isFeatured: z.boolean().optional(),
  featuredOrder: z.number().min(0).optional(),
  icon: z.string().max(50).optional(),
  heroImageUrl: z.string().url().optional().or(z.literal('')),
  cardImageUrl: z.string().url().optional().or(z.literal('')),
  marketType: z.enum(['binary', 'multi_outcome']).optional(),
  timezone: z.string().min(1),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime(),
  resolvesBy: z.string().datetime(),
  settlesBy: z.string().datetime(),
  constraints: marketConstraintsSchema.optional(),
  rulesText: z.string().min(10).max(10000),
  rulesStructured: marketRulesStructuredSchema.optional(),
  resolutionSource: z.string().max(500).optional(),
  initialYesPrice: z.number().min(1).max(99).optional(),
  assignedToId: z.string().uuid().optional(),
  outcomes: z.array(createOutcomeSchema).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateMarketSchema = createMarketSchema.partial().extend({
  status: z.enum([
    'draft', 'review', 'approved', 'published',
    'trading_halted', 'resolved', 'settled', 'archived'
  ]).optional(),
  currentYesPrice: z.number().min(1).max(99).optional(),
  currentNoPrice: z.number().min(1).max(99).optional(),
});

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

export const createCategorySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  displayOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ============================================================================
// SUBCATEGORY SCHEMAS
// ============================================================================

export const createSubcategorySchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  displayOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateSubcategorySchema = createSubcategorySchema.partial().omit({ categoryId: true });

// ============================================================================
// TAG SCHEMAS
// ============================================================================

export const createTagSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateTagSchema = createTagSchema.partial();

// ============================================================================
// COLLECTION SCHEMAS
// ============================================================================

export const createCollectionSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  heroImageUrl: z.string().url().optional().or(z.literal('')),
  displayOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  marketIds: z.array(z.string().uuid()).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

// ============================================================================
// ADMIN USER SCHEMAS
// ============================================================================

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['super_admin', 'admin', 'operator', 'viewer']),
});

export const updateAdminUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(100).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['super_admin', 'admin', 'operator', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// RESOLUTION SCHEMA
// ============================================================================

export const createResolutionSchema = z.object({
  outcomeId: z.string().uuid().optional(),
  resolution: z.string().min(1),
  resolutionNotes: z.string().max(2000).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  sourceData: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// MARKET RELATION SCHEMA
// ============================================================================

export const createMarketRelationSchema = z.object({
  relatedMarketId: z.string().uuid(),
  relationType: z.enum(['related', 'similar', 'same_event', 'follow_up']).optional(),
  displayOrder: z.number().min(0).optional(),
});

// ============================================================================
// APPROVAL SCHEMA
// ============================================================================

export const createApprovalSchema = z.object({
  fromStatus: z.enum([
    'draft', 'review', 'approved', 'published',
    'trading_halted', 'resolved', 'settled', 'archived'
  ]),
  toStatus: z.enum([
    'draft', 'review', 'approved', 'published',
    'trading_halted', 'resolved', 'settled', 'archived'
  ]),
  action: z.enum(['submitted', 'approved', 'rejected', 'needs_changes']),
  comments: z.string().max(2000).optional(),
});

// ============================================================================
// CONSTRAINT TEMPLATE SCHEMA
// ============================================================================

export const createConstraintTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  constraints: marketConstraintsSchema,
  isDefault: z.boolean().optional(),
});

export const updateConstraintTemplateSchema = createConstraintTemplateSchema.partial();

// ============================================================================
// QUERY PARAMS SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const marketFiltersSchema = z.object({
  status: z.enum([
    'draft', 'review', 'approved', 'published',
    'trading_halted', 'resolved', 'settled', 'archived'
  ]).optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  isFeatured: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  createdById: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'closesAt', 'title', 'volume']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const auditLogFiltersSchema = z.object({
  entityType: z.enum([
    'market', 'category', 'subcategory', 'tag',
    'collection', 'admin_user', 'constraint_template'
  ]).optional(),
  entityId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.enum([
    'create', 'update', 'delete', 'approve',
    'reject', 'resolve', 'settle', 'rollback', 'login', 'logout'
  ]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Helper to validate and parse
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
