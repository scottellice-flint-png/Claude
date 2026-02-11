// MarketOps Admin Types
// These types mirror the Prisma schema and provide full TypeScript support

// ============================================================================
// ENUMS
// ============================================================================

export type MarketStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'trading_halted'
  | 'resolved'
  | 'settled'
  | 'archived';

export type MarketType = 'binary' | 'multi_outcome';

export type AdminRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

export type ApprovalAction = 'submitted' | 'approved' | 'rejected' | 'needs_changes';

export type RelationType = 'related' | 'similar' | 'same_event' | 'follow_up';

export type ResolutionValue = 'yes' | 'no' | 'void' | string;

export type SettlementStatus = 'pending' | 'processing' | 'completed';

export type ChangeType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'resolved'
  | 'settled'
  | 'rolled_back';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'resolve'
  | 'settle'
  | 'rollback'
  | 'login'
  | 'logout';

export type EntityType =
  | 'market'
  | 'category'
  | 'subcategory'
  | 'tag'
  | 'collection'
  | 'admin_user'
  | 'constraint_template';

// ============================================================================
// MARKET CONSTRAINTS (JSON Structure)
// ============================================================================

export interface MarketConstraints {
  // Trading limits
  minTradeAmount?: number;      // Minimum trade in cents
  maxTradeAmount?: number;      // Maximum single trade in cents
  maxPositionSize?: number;     // Maximum contracts per position
  maxNotionalExposure?: number; // Maximum total $ at risk

  // Jurisdiction
  jurisdictionEligibility?: string[];  // e.g., ['AU', 'NZ']
  excludedJurisdictions?: string[];
  kycRequired?: boolean;
  kycLevel?: 'basic' | 'enhanced' | 'full';

  // User type restrictions
  allowedUserTypes?: string[];  // e.g., ['retail', 'institutional']
  noveltyCapEnabled?: boolean;  // Cap on "for fun" markets
  noveltyCapAmount?: number;

  // Time restrictions
  tradingHoursEnabled?: boolean;
  tradingHoursStart?: string;  // "09:00"
  tradingHoursEnd?: string;    // "17:00"
  tradingDays?: number[];      // [1,2,3,4,5] for Mon-Fri

  // Other
  marginRequirement?: number;  // Percentage
  feeStructure?: 'standard' | 'reduced' | 'premium';
}

// ============================================================================
// STRUCTURED RULES (JSON Structure)
// ============================================================================

export interface MarketRulesStructured {
  resolutionCriteria?: string[];
  voidConditions?: string[];
  tieBreakers?: string[];
  edgeCases?: Array<{
    scenario: string;
    resolution: string;
  }>;
  dataSourcePriority?: string[];
  resolutionTimeframe?: string;
  amendmentPolicy?: string;
}

// ============================================================================
// ADMIN USER
// ============================================================================

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserWithPassword extends AdminUser {
  passwordHash: string;
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

export interface UpdateAdminUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: AdminRole;
  isActive?: boolean;
}

// ============================================================================
// CATEGORY & SUBCATEGORY
// ============================================================================

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories?: Subcategory[];
  _count?: {
    markets: number;
  };
}

export interface Subcategory {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface CreateCategoryInput {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateSubcategoryInput {
  categoryId: string;
  slug: string;
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ============================================================================
// TAG
// ============================================================================

export interface Tag {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    markets: number;
  };
}

export interface CreateTagInput {
  slug: string;
  name: string;
  description?: string;
  color?: string;
}

// ============================================================================
// MARKET OUTCOME
// ============================================================================

export interface MarketOutcome {
  id: string;
  marketId: string;
  label: string;
  displayLabel?: string;
  description?: string;
  position: number;
  currentPrice: number;
  initialPrice: number;
  color?: string;
  isResolved: boolean;
  isWinner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOutcomeInput {
  label: string;
  displayLabel?: string;
  description?: string;
  position?: number;
  initialPrice?: number;
  color?: string;
}

export interface UpdateOutcomeInput extends Partial<CreateOutcomeInput> {
  currentPrice?: number;
  isResolved?: boolean;
  isWinner?: boolean;
}

// ============================================================================
// MARKET
// ============================================================================

export interface Market {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status: MarketStatus;
  categoryId: string;
  subcategoryId?: string;
  isFeatured: boolean;
  featuredOrder?: number;
  icon?: string;
  heroImageUrl?: string;
  cardImageUrl?: string;
  marketType: MarketType;
  timezone: string;
  opensAt?: string;
  closesAt: string;
  resolvesBy: string;
  settlesBy: string;
  constraints: MarketConstraints;
  rulesText: string;
  rulesStructured: MarketRulesStructured;
  resolutionSource?: string;
  initialYesPrice: number;
  currentYesPrice: number;
  currentNoPrice: number;
  volume: number;
  liquidity: number;
  tradeCount: number;
  resolvedOutcomeId?: string;
  resolvedAt?: string;
  settledAt?: string;
  createdById?: string;
  assignedToId?: string;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  category?: Category;
  subcategory?: Subcategory;
  creator?: AdminUser;
  assignee?: AdminUser;
  outcomes?: MarketOutcome[];
  tags?: MarketTagJoin[];
  versions?: MarketVersion[];
  approvals?: MarketApproval[];
  relatedMarkets?: MarketRelation[];
  collections?: MarketCollectionItem[];
}

export interface MarketTagJoin {
  id: string;
  marketId: string;
  tagId: string;
  createdAt: string;
  tag?: Tag;
}

export interface CreateMarketInput {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  isFeatured?: boolean;
  featuredOrder?: number;
  icon?: string;
  heroImageUrl?: string;
  cardImageUrl?: string;
  marketType?: MarketType;
  timezone?: string;
  opensAt?: string;
  closesAt: string;
  resolvesBy: string;
  settlesBy: string;
  constraints?: MarketConstraints;
  rulesText: string;
  rulesStructured?: MarketRulesStructured;
  resolutionSource?: string;
  initialYesPrice?: number;
  assignedToId?: string;
  outcomes?: CreateOutcomeInput[];
  tagIds?: string[];
}

export interface UpdateMarketInput extends Partial<Omit<CreateMarketInput, 'outcomes' | 'tagIds'>> {
  status?: MarketStatus;
  currentYesPrice?: number;
  currentNoPrice?: number;
}

// ============================================================================
// MARKET VERSION
// ============================================================================

export interface MarketVersion {
  id: string;
  marketId: string;
  version: number;
  data: Record<string, unknown>;
  changeType: ChangeType;
  changeSummary?: string;
  createdById: string;
  createdAt: string;
  createdBy?: AdminUser;
}

// ============================================================================
// MARKET APPROVAL
// ============================================================================

export interface MarketApproval {
  id: string;
  marketId: string;
  fromStatus: MarketStatus;
  toStatus: MarketStatus;
  action: ApprovalAction;
  comments?: string;
  approvedById: string;
  approvedAt: string;
  approvedBy?: AdminUser;
}

export interface CreateApprovalInput {
  fromStatus: MarketStatus;
  toStatus: MarketStatus;
  action: ApprovalAction;
  comments?: string;
}

// ============================================================================
// MARKET RESOLUTION
// ============================================================================

export interface MarketResolution {
  id: string;
  marketId: string;
  outcomeId?: string;
  resolution: ResolutionValue;
  resolutionNotes?: string;
  sourceUrl?: string;
  sourceData?: Record<string, unknown>;
  resolvedById: string;
  resolvedAt: string;
  settlementStatus: SettlementStatus;
  settledAt?: string;
  resolvedBy?: AdminUser;
}

export interface CreateResolutionInput {
  outcomeId?: string;
  resolution: ResolutionValue;
  resolutionNotes?: string;
  sourceUrl?: string;
  sourceData?: Record<string, unknown>;
}

// ============================================================================
// RELATED MARKETS
// ============================================================================

export interface MarketRelation {
  id: string;
  sourceMarketId: string;
  relatedMarketId: string;
  relationType: RelationType;
  displayOrder: number;
  createdAt: string;
  relatedMarket?: Market;
}

export interface CreateMarketRelationInput {
  relatedMarketId: string;
  relationType?: RelationType;
  displayOrder?: number;
}

// ============================================================================
// MARKET COLLECTIONS
// ============================================================================

export interface MarketCollection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  heroImageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  markets?: MarketCollectionItem[];
  _count?: {
    markets: number;
  };
}

export interface MarketCollectionItem {
  id: string;
  collectionId: string;
  marketId: string;
  displayOrder: number;
  createdAt: string;
  market?: Market;
  collection?: MarketCollection;
}

export interface CreateCollectionInput {
  slug: string;
  name: string;
  description?: string;
  heroImageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  marketIds?: string[];
}

export interface UpdateCollectionInput extends Partial<Omit<CreateCollectionInput, 'marketIds'>> {}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
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
  createdAt: string;
  user?: AdminUser;
}

export interface AuditLogFilters {
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// CONSTRAINT TEMPLATE
// ============================================================================

export interface ConstraintTemplate {
  id: string;
  name: string;
  description?: string;
  constraints: MarketConstraints;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConstraintTemplateInput {
  name: string;
  description?: string;
  constraints: MarketConstraints;
  isDefault?: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// WORKFLOW STATE MACHINE
// ============================================================================

export const MARKET_STATUS_TRANSITIONS: Record<MarketStatus, MarketStatus[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['published', 'review'],
  published: ['trading_halted', 'resolved'],
  trading_halted: ['published', 'resolved'],
  resolved: ['settled', 'published'], // Can revert if resolution was wrong
  settled: ['archived'],
  archived: [],
};

export const MARKET_STATUS_LABELS: Record<MarketStatus, string> = {
  draft: 'Draft',
  review: 'Under Review',
  approved: 'Approved',
  published: 'Live/Published',
  trading_halted: 'Trading Halted',
  resolved: 'Resolved',
  settled: 'Settled',
  archived: 'Archived',
};

export const MARKET_STATUS_COLORS: Record<MarketStatus, string> = {
  draft: 'gray',
  review: 'yellow',
  approved: 'blue',
  published: 'green',
  trading_halted: 'orange',
  resolved: 'purple',
  settled: 'teal',
  archived: 'gray',
};

// ============================================================================
// ROLE PERMISSIONS
// ============================================================================

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  admin: [
    'market:create',
    'market:read',
    'market:update',
    'market:delete',
    'market:approve',
    'market:publish',
    'market:resolve',
    'market:settle',
    'category:manage',
    'tag:manage',
    'collection:manage',
    'user:read',
    'audit:read',
  ],
  operator: [
    'market:create',
    'market:read',
    'market:update',
    'market:submit_review',
    'category:read',
    'tag:read',
    'collection:read',
    'audit:read',
  ],
  viewer: [
    'market:read',
    'category:read',
    'tag:read',
    'collection:read',
    'audit:read',
  ],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(permission);
}

// ============================================================================
// TIMEZONE HELPERS
// ============================================================================

export const SUPPORTED_TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];
