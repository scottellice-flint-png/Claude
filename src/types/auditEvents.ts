// ============================================================================
// AUDIT EVENT TYPES - Comprehensive event classification for regulatory compliance
// ============================================================================

// ============================================================================
// ACTOR TYPES
// ============================================================================

export type ActorType = 'user' | 'admin' | 'system';

// ============================================================================
// EVENT TYPE CATEGORIES
// ============================================================================

// Customer / Account Events
export type CustomerEventType =
  | 'USER_LOGIN_SUCCESS'
  | 'USER_LOGIN_FAIL'
  | 'USER_LOGOUT'
  | 'USER_REGISTERED'
  | 'KYC_LINKED'
  | 'KYC_VERIFIED'
  | 'KYC_REJECTED'
  | 'LIMITS_UPDATED'
  | 'SELF_EXCLUSION_SET'
  | 'SELF_EXCLUSION_REMOVED'
  | 'ACCOUNT_STATUS_CHANGED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_CLOSED'
  | 'ACCOUNT_REACTIVATED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED';

// Wallet / Payment Events
export type WalletEventType =
  | 'DEPOSIT_CREATED'
  | 'DEPOSIT_SUCCEEDED'
  | 'DEPOSIT_FAILED'
  | 'WITHDRAWAL_CREATED'
  | 'WITHDRAWAL_SUCCEEDED'
  | 'WITHDRAWAL_FAILED'
  | 'WITHDRAWAL_CANCELLED'
  | 'BALANCE_ADJUSTED'
  | 'BALANCE_CREDITED'
  | 'BALANCE_DEBITED';

// Market Lifecycle Events
export type MarketLifecycleEventType =
  | 'MARKET_CREATED'
  | 'MARKET_UPDATED'
  | 'MARKET_SUBMITTED_FOR_REVIEW'
  | 'MARKET_APPROVED'
  | 'MARKET_REJECTED'
  | 'MARKET_PUBLISHED'
  | 'MARKET_SUSPENDED'
  | 'MARKET_REOPENED'
  | 'MARKET_CLOSED'
  | 'MARKET_RESOLVED'
  | 'MARKET_SETTLED'
  | 'MARKET_VOIDED'
  | 'MARKET_ARCHIVED'
  | 'MARKET_ROLLED_BACK';

// Trading / Bets / Orders Events
export type TradingEventType =
  | 'ORDER_CREATED'
  | 'ORDER_MATCHED'
  | 'ORDER_CANCELLED'
  | 'ORDER_EXPIRED'
  | 'ORDER_REJECTED'
  | 'BET_PLACED'
  | 'BET_MATCHED'
  | 'BET_CANCELLED'
  | 'BET_SETTLED'
  | 'TRADE_EXECUTED'
  | 'CASHOUT_REQUESTED'
  | 'CASHOUT_EXECUTED'
  | 'CASHOUT_FAILED'
  | 'COMMISSION_APPLIED';

// Pricing / AMM Events
export type PricingEventType =
  | 'AMM_QUOTE_GENERATED'
  | 'AMM_STATE_CHANGED'
  | 'AMM_PRICE_UPDATED'
  | 'LP_ADDED_LIQUIDITY'
  | 'LP_REMOVED_LIQUIDITY'
  | 'LP_REBALANCED'
  | 'POOL_STATE_CHANGED';

// Admin / Operator Events
export type AdminEventType =
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAIL'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_USER_CREATED'
  | 'ADMIN_USER_UPDATED'
  | 'ADMIN_USER_DEACTIVATED'
  | 'ADMIN_USER_REACTIVATED'
  | 'ADMIN_PERMISSION_CHANGED'
  | 'ADMIN_MARKET_CREATED'
  | 'ADMIN_MARKET_UPDATED'
  | 'ADMIN_MARKET_SUSPENDED'
  | 'ADMIN_MARKET_REOPENED'
  | 'ADMIN_MARKET_RESOLVED'
  | 'ADMIN_MARKET_SETTLED'
  | 'ADMIN_MARKET_VOIDED'
  | 'ADMIN_ACCOUNT_ACTION'
  | 'ADMIN_BALANCE_ADJUSTMENT';

// System Events
export type SystemEventType =
  | 'DEPLOYMENT_RECORDED'
  | 'CONFIG_CHANGED'
  | 'API_ERROR_RECORDED'
  | 'UPTIME_HEARTBEAT'
  | 'SYSTEM_MAINTENANCE_STARTED'
  | 'SYSTEM_MAINTENANCE_ENDED'
  | 'DATABASE_MIGRATION'
  | 'SCHEDULED_JOB_RUN';

// Category / Tag / Collection Admin Events
export type CatalogEventType =
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'SUBCATEGORY_CREATED'
  | 'SUBCATEGORY_UPDATED'
  | 'SUBCATEGORY_DELETED'
  | 'TAG_CREATED'
  | 'TAG_UPDATED'
  | 'TAG_DELETED'
  | 'COLLECTION_CREATED'
  | 'COLLECTION_UPDATED'
  | 'COLLECTION_DELETED'
  | 'MARKET_TAGS_UPDATED'
  | 'MARKET_RELATIONS_UPDATED';

// Combined Event Type
export type AuditEventType =
  | CustomerEventType
  | WalletEventType
  | MarketLifecycleEventType
  | TradingEventType
  | PricingEventType
  | AdminEventType
  | SystemEventType
  | CatalogEventType;

// ============================================================================
// REASON CODES (Required for admin actions)
// ============================================================================

export type ReasonCode =
  // Compliance reasons
  | 'COMPLIANCE_REVIEW'
  | 'REGULATORY_REQUIREMENT'
  | 'AML_CONCERN'
  | 'FRAUD_SUSPECTED'
  | 'IDENTITY_VERIFICATION_FAILED'
  // User-initiated reasons
  | 'USER_REQUEST'
  | 'USER_SELF_EXCLUSION'
  // Operational reasons
  | 'DATA_CORRECTION'
  | 'SYSTEM_ERROR_CORRECTION'
  | 'DUPLICATE_ENTRY'
  | 'TECHNICAL_ISSUE'
  // Market reasons
  | 'MARKET_RULES_VIOLATION'
  | 'EVENT_CANCELLED'
  | 'SOURCE_DATA_ERROR'
  | 'SETTLEMENT_ERROR'
  | 'PRICING_ERROR'
  // Admin reasons
  | 'POLICY_CHANGE'
  | 'MAINTENANCE'
  | 'SECURITY_CONCERN'
  // DMM reasons
  | 'DMM_REGISTRATION'
  | 'DMM_APPROVED'
  | 'DMM_SUSPENDED'
  | 'DMM_AUTO_SUSPENDED'
  // Other
  | 'OTHER';

// ============================================================================
// EVENT TYPE METADATA - Defines requirements for each event type
// ============================================================================

export interface EventTypeConfig {
  requiresReasonCode: boolean;
  requiresMarketId: boolean;
  requiresBetId: boolean;
  requiresBeforeState: boolean;
  requiresAfterState: boolean;
  category: string;
}

export const EVENT_TYPE_CONFIG: Record<AuditEventType, EventTypeConfig> = {
  // Customer events
  USER_LOGIN_SUCCESS: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'customer' },
  USER_LOGIN_FAIL: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'customer' },
  USER_LOGOUT: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'customer' },
  USER_REGISTERED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'customer' },
  KYC_LINKED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'customer' },
  KYC_VERIFIED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  KYC_REJECTED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  LIMITS_UPDATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  SELF_EXCLUSION_SET: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'customer' },
  SELF_EXCLUSION_REMOVED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  ACCOUNT_STATUS_CHANGED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  ACCOUNT_SUSPENDED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  ACCOUNT_CLOSED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  ACCOUNT_REACTIVATED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'customer' },
  PASSWORD_CHANGED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'customer' },
  PASSWORD_RESET_REQUESTED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'customer' },
  PASSWORD_RESET_COMPLETED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'customer' },

  // Wallet events
  DEPOSIT_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  DEPOSIT_SUCCEEDED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  DEPOSIT_FAILED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'wallet' },
  WITHDRAWAL_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  WITHDRAWAL_SUCCEEDED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  WITHDRAWAL_FAILED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'wallet' },
  WITHDRAWAL_CANCELLED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  BALANCE_ADJUSTED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  BALANCE_CREDITED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },
  BALANCE_DEBITED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'wallet' },

  // Market lifecycle events
  MARKET_CREATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'market' },
  MARKET_UPDATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_SUBMITTED_FOR_REVIEW: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_APPROVED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_REJECTED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_PUBLISHED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_SUSPENDED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_REOPENED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_CLOSED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_RESOLVED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_SETTLED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_VOIDED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_ARCHIVED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },
  MARKET_ROLLED_BACK: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'market' },

  // Trading events
  ORDER_CREATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: false, requiresAfterState: true, category: 'trading' },
  ORDER_MATCHED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  ORDER_CANCELLED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  ORDER_EXPIRED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  ORDER_REJECTED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: true, requiresBeforeState: false, requiresAfterState: false, category: 'trading' },
  BET_PLACED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  BET_MATCHED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  BET_CANCELLED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  BET_SETTLED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  TRADE_EXECUTED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  CASHOUT_REQUESTED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: false, category: 'trading' },
  CASHOUT_EXECUTED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: true, category: 'trading' },
  CASHOUT_FAILED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: true, requiresBeforeState: true, requiresAfterState: false, category: 'trading' },
  COMMISSION_APPLIED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'trading' },

  // Pricing / AMM events
  AMM_QUOTE_GENERATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'pricing' },
  AMM_STATE_CHANGED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'pricing' },
  AMM_PRICE_UPDATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'pricing' },
  LP_ADDED_LIQUIDITY: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'pricing' },
  LP_REMOVED_LIQUIDITY: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'pricing' },
  LP_REBALANCED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'pricing' },
  POOL_STATE_CHANGED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'pricing' },

  // Admin events
  ADMIN_LOGIN_SUCCESS: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'admin' },
  ADMIN_LOGIN_FAIL: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'admin' },
  ADMIN_LOGOUT: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'admin' },
  ADMIN_USER_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'admin' },
  ADMIN_USER_UPDATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_USER_DEACTIVATED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_USER_REACTIVATED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_PERMISSION_CHANGED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_CREATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_UPDATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_SUSPENDED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_REOPENED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_RESOLVED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_SETTLED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_MARKET_VOIDED: { requiresReasonCode: true, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_ACCOUNT_ACTION: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },
  ADMIN_BALANCE_ADJUSTMENT: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'admin' },

  // System events
  DEPLOYMENT_RECORDED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'system' },
  CONFIG_CHANGED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'system' },
  API_ERROR_RECORDED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'system' },
  UPTIME_HEARTBEAT: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: false, category: 'system' },
  SYSTEM_MAINTENANCE_STARTED: { requiresReasonCode: true, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'system' },
  SYSTEM_MAINTENANCE_ENDED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'system' },
  DATABASE_MIGRATION: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'system' },
  SCHEDULED_JOB_RUN: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'system' },

  // Catalog events
  CATEGORY_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'catalog' },
  CATEGORY_UPDATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'catalog' },
  CATEGORY_DELETED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'catalog' },
  SUBCATEGORY_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'catalog' },
  SUBCATEGORY_UPDATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'catalog' },
  SUBCATEGORY_DELETED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'catalog' },
  TAG_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'catalog' },
  TAG_UPDATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'catalog' },
  TAG_DELETED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'catalog' },
  COLLECTION_CREATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: false, requiresAfterState: true, category: 'catalog' },
  COLLECTION_UPDATED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'catalog' },
  COLLECTION_DELETED: { requiresReasonCode: false, requiresMarketId: false, requiresBetId: false, requiresBeforeState: true, requiresAfterState: false, category: 'catalog' },
  MARKET_TAGS_UPDATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'catalog' },
  MARKET_RELATIONS_UPDATED: { requiresReasonCode: false, requiresMarketId: true, requiresBetId: false, requiresBeforeState: true, requiresAfterState: true, category: 'catalog' },
};

// ============================================================================
// AUDIT EVENT INPUT INTERFACE
// ============================================================================

export interface AuditEventInput {
  eventType: AuditEventType;
  actorType: ActorType;
  actorId?: string;
  actorKycRef?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
  marketId?: string;
  betId?: string;
  tradeId?: string;
  orderId?: string;
  rulesVersion?: number;
  pricingVersion?: number;
  reasonCode?: ReasonCode;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AUDIT EVENT OUTPUT INTERFACE
// ============================================================================

export interface AuditEventOutput {
  id: string;
  occurredAt: string;
  occurredAtMs: string;
  seq: string;
  eventType: AuditEventType;
  actorType: ActorType;
  actorId?: string;
  actorKycRef?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
  marketId?: string;
  betId?: string;
  tradeId?: string;
  orderId?: string;
  rulesVersion?: number;
  pricingVersion?: number;
  reasonCode?: ReasonCode;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  integrityHash?: string;
  previousHash?: string;
  createdAt: string;
}

// ============================================================================
// MARKET STATE SNAPSHOT (for reconstruction)
// ============================================================================

export interface MarketStateSnapshot {
  marketId: string;
  snapshotAt: string;
  status: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume: number;
  liquidity: number;
  tradeCount: number;
  outcomes: Array<{
    id: string;
    label: string;
    currentPrice: number;
    isResolved: boolean;
    isWinner: boolean;
  }>;
  resolvedOutcomeId?: string;
  resolvedAt?: string;
  settledAt?: string;
}

// ============================================================================
// EXPORT FORMATS
// ============================================================================

export type ExportFormat = 'json' | 'csv';

export interface AuditExportFilters {
  marketId?: string;
  betId?: string;
  orderId?: string;
  actorId?: string;
  eventTypes?: AuditEventType[];
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}
