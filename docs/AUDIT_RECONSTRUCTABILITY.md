# Audit & Reconstructability System

## Overview

The Foremark platform implements a comprehensive append-only audit event logging system designed for regulatory compliance. This system enables complete reconstruction of any market state at any point in time and provides a tamper-evident chain of custody for all state-changing operations.

## Key Features

### 1. Append-Only Event Log
- All audit events are immutable once written
- No updates or deletions permitted via application layer
- Hash chaining provides tamper evidence
- 7-year default retention policy

### 2. Comprehensive Event Coverage
The system captures:
- **Customer Actions**: Login/logout, registration, password changes, account status changes
- **Market Lifecycle**: Creation, updates, approval workflow, resolution, settlement
- **Trading/Orders**: Order placement, matching, cancellation, execution
- **Pricing/AMM**: Quote generation, price updates, liquidity changes
- **Admin Operations**: User management, market interventions, permission changes
- **System Events**: Deployments, configuration changes, errors

### 3. Monotonic Ordering
- Every event receives a globally unique sequence number (`seq`)
- Millisecond UTC timestamps (`occurredAtMs`) for precise timing
- Allows deterministic ordering and replay

### 4. Hash Chain Integrity
Each event stores:
- `integrityHash`: SHA-256 of the canonical event payload combined with the previous hash
- `previousHash`: Reference to the prior event's hash

This creates a blockchain-like chain that detects any tampering or insertion.

## Event Types

### Customer/Account Events
| Event Type | Description | Required Fields |
|------------|-------------|-----------------|
| USER_LOGIN_SUCCESS | Successful user login | actorId |
| USER_LOGIN_FAIL | Failed login attempt | - |
| USER_REGISTERED | New user registration | actorId, afterState |
| PASSWORD_CHANGED | Password change | actorId |
| ACCOUNT_STATUS_CHANGED | Account suspension/closure | actorId, reasonCode |

### Market Lifecycle Events
| Event Type | Description | Required Fields |
|------------|-------------|-----------------|
| MARKET_CREATED | Market creation | marketId, afterState |
| MARKET_UPDATED | Market data update | marketId, beforeState, afterState |
| MARKET_PUBLISHED | Market goes live | marketId, beforeState, afterState |
| MARKET_SUSPENDED | Trading halted | marketId, reasonCode |
| MARKET_RESOLVED | Outcome determined | marketId, afterState |
| MARKET_SETTLED | Payouts completed | marketId, afterState |

### Trading Events
| Event Type | Description | Required Fields |
|------------|-------------|-----------------|
| ORDER_CREATED | New order placed | marketId, orderId, afterState |
| ORDER_MATCHED | Order filled | marketId, orderId, tradeId |
| ORDER_CANCELLED | Order cancelled | marketId, orderId |
| TRADE_EXECUTED | Trade completion | marketId, tradeId, beforeState, afterState |

### Admin Events (require reasonCode)
| Event Type | Description | Required Fields |
|------------|-------------|-----------------|
| ADMIN_MARKET_SUSPENDED | Admin halts trading | marketId, reasonCode |
| ADMIN_MARKET_VOIDED | Admin voids market | marketId, reasonCode |
| ADMIN_USER_DEACTIVATED | Admin deactivates user | reasonCode |
| ADMIN_BALANCE_ADJUSTMENT | Manual balance change | reasonCode, beforeState, afterState |

## State Reconstruction

### How It Works
1. Query all events for a market up to a target timestamp
2. Replay events in sequence order
3. Apply state transformations based on event type
4. Return computed snapshot

### API Endpoint
```
GET /api/admin/audit/reconstruct?marketId={id}&timestamp={ISO8601}
```

### Response
```json
{
  "success": true,
  "reconstructedAt": "2024-06-15T10:30:00Z",
  "requestedTimestamp": "2024-06-14T23:59:59Z",
  "snapshot": {
    "marketId": "mkt_123",
    "status": "published",
    "currentYesPrice": 65,
    "currentNoPrice": 35,
    "volume": 15000,
    "liquidity": 5000,
    "tradeCount": 47,
    "outcomes": [...]
  }
}
```

## Export Tools

### Available Endpoints

1. **Export Events**
   ```
   GET /api/admin/audit/export?format=json&marketId={id}&startTime={ISO}&endTime={ISO}
   ```

2. **Export Market Lifecycle**
   ```
   GET /api/admin/audit/export?type=market&marketId={id}&format=json
   ```

3. **Export Bet/Order Lifecycle**
   ```
   GET /api/admin/audit/export?type=bet&betId={id}&format=json
   ```

### Rate Limits
- Export: 10 requests per minute
- Query: 30 requests per minute
- Verification: 5 requests per 5 minutes

## Example Exports

### 1. Market Lifecycle Timeline

```json
{
  "marketId": "mkt_presidential_2024",
  "exportedAt": "2024-06-15T10:30:00Z",
  "totalEvents": 8,
  "events": [
    {
      "seq": "1001",
      "occurredAt": "2024-01-15T09:00:00Z",
      "eventType": "ADMIN_MARKET_CREATED",
      "actorType": "admin",
      "actorId": "admin_alice",
      "marketId": "mkt_presidential_2024",
      "afterState": {
        "status": "draft",
        "title": "2024 Presidential Election",
        "currentYesPrice": 50,
        "currentNoPrice": 50
      }
    },
    {
      "seq": "1002",
      "occurredAt": "2024-01-15T10:00:00Z",
      "eventType": "MARKET_SUBMITTED_FOR_REVIEW",
      "actorType": "admin",
      "actorId": "admin_alice",
      "marketId": "mkt_presidential_2024",
      "beforeState": { "status": "draft" },
      "afterState": { "status": "review" }
    },
    {
      "seq": "1003",
      "occurredAt": "2024-01-15T14:00:00Z",
      "eventType": "MARKET_APPROVED",
      "actorType": "admin",
      "actorId": "admin_bob",
      "marketId": "mkt_presidential_2024",
      "beforeState": { "status": "review" },
      "afterState": { "status": "approved" }
    },
    {
      "seq": "1004",
      "occurredAt": "2024-01-16T00:00:00Z",
      "eventType": "MARKET_PUBLISHED",
      "actorType": "system",
      "marketId": "mkt_presidential_2024",
      "beforeState": { "status": "approved" },
      "afterState": { "status": "published", "currentYesPrice": 50 }
    },
    {
      "seq": "2500",
      "occurredAt": "2024-11-05T23:00:00Z",
      "eventType": "MARKET_CLOSED",
      "actorType": "system",
      "marketId": "mkt_presidential_2024",
      "afterState": { "status": "closed", "volume": 1500000, "tradeCount": 15000 }
    },
    {
      "seq": "2600",
      "occurredAt": "2024-11-06T08:00:00Z",
      "eventType": "ADMIN_MARKET_RESOLVED",
      "actorType": "admin",
      "actorId": "admin_alice",
      "marketId": "mkt_presidential_2024",
      "beforeState": { "status": "closed", "resolvedOutcomeId": null },
      "afterState": { "status": "resolved", "resolvedOutcomeId": "outcome_yes", "resolution": "yes" },
      "metadata": { "sourceUrl": "https://ap.org/results", "resolutionNotes": "AP called race" }
    },
    {
      "seq": "2700",
      "occurredAt": "2024-11-06T12:00:00Z",
      "eventType": "ADMIN_MARKET_SETTLED",
      "actorType": "admin",
      "actorId": "admin_alice",
      "marketId": "mkt_presidential_2024",
      "afterState": { "status": "settled", "settledAt": "2024-11-06T12:00:00Z" }
    }
  ]
}
```

### 2. Trade Lifecycle (Quote -> Execution -> Commission)

```json
{
  "orderId": "order_abc123",
  "exportedAt": "2024-06-15T10:30:00Z",
  "totalEvents": 4,
  "events": [
    {
      "seq": "5001",
      "occurredAt": "2024-06-01T14:30:00Z",
      "eventType": "AMM_QUOTE_GENERATED",
      "actorType": "user",
      "actorId": "user_john",
      "marketId": "mkt_123",
      "orderId": "order_abc123",
      "pricingVersion": 1,
      "beforeState": {
        "poolYes": 10000,
        "poolNo": 10000,
        "currentPrice": 50
      },
      "metadata": {
        "requestedSide": "yes",
        "requestedQuantity": 100,
        "quotedPrice": 52,
        "estimatedSlippage": 0.4
      }
    },
    {
      "seq": "5002",
      "occurredAt": "2024-06-01T14:30:01Z",
      "eventType": "ORDER_CREATED",
      "actorType": "user",
      "actorId": "user_john",
      "marketId": "mkt_123",
      "orderId": "order_abc123",
      "afterState": {
        "id": "order_abc123",
        "side": "yes",
        "quantity": 100,
        "price": 52,
        "status": "pending"
      }
    },
    {
      "seq": "5003",
      "occurredAt": "2024-06-01T14:30:02Z",
      "eventType": "TRADE_EXECUTED",
      "actorType": "system",
      "marketId": "mkt_123",
      "orderId": "order_abc123",
      "tradeId": "trade_xyz789",
      "pricingVersion": 1,
      "beforeState": {
        "userBalance": 1000,
        "poolYes": 10000,
        "poolNo": 10000,
        "price": 50
      },
      "afterState": {
        "userBalance": 948,
        "poolYes": 10100,
        "poolNo": 9900,
        "price": 52,
        "sharesAcquired": 100
      },
      "metadata": {
        "fillPrice": 52,
        "totalCost": 52,
        "slippage": 0.4
      }
    },
    {
      "seq": "5004",
      "occurredAt": "2024-06-01T14:30:02Z",
      "eventType": "COMMISSION_APPLIED",
      "actorType": "system",
      "marketId": "mkt_123",
      "orderId": "order_abc123",
      "tradeId": "trade_xyz789",
      "afterState": {
        "commissionAmount": 0.52,
        "commissionRate": 0.01,
        "netCost": 52.52
      }
    }
  ]
}
```

### 3. Admin Suspension and Reopen with Reason Codes

```json
{
  "marketId": "mkt_controversial",
  "exportedAt": "2024-06-15T10:30:00Z",
  "totalEvents": 3,
  "events": [
    {
      "seq": "8001",
      "occurredAt": "2024-05-20T15:00:00Z",
      "eventType": "ADMIN_MARKET_SUSPENDED",
      "actorType": "admin",
      "actorId": "admin_compliance",
      "marketId": "mkt_controversial",
      "reasonCode": "COMPLIANCE_REVIEW",
      "beforeState": {
        "status": "published",
        "currentYesPrice": 72,
        "volume": 50000
      },
      "afterState": {
        "status": "trading_halted",
        "currentYesPrice": 72,
        "volume": 50000
      },
      "metadata": {
        "suspensionReason": "Regulatory inquiry pending",
        "estimatedReviewDuration": "48 hours",
        "affectedPositions": 234
      }
    },
    {
      "seq": "8050",
      "occurredAt": "2024-05-22T09:30:00Z",
      "eventType": "ADMIN_MARKET_REOPENED",
      "actorType": "admin",
      "actorId": "admin_compliance",
      "marketId": "mkt_controversial",
      "reasonCode": "COMPLIANCE_REVIEW",
      "beforeState": {
        "status": "trading_halted"
      },
      "afterState": {
        "status": "published",
        "currentYesPrice": 72
      },
      "metadata": {
        "reopenReason": "Regulatory review completed - no issues found",
        "reviewDuration": "42 hours",
        "reviewReference": "REG-2024-0520"
      }
    },
    {
      "seq": "9000",
      "occurredAt": "2024-06-01T00:00:00Z",
      "eventType": "MARKET_CLOSED",
      "actorType": "system",
      "marketId": "mkt_controversial",
      "afterState": {
        "status": "closed",
        "finalPrice": 85,
        "volume": 120000,
        "tradeCount": 1500
      }
    }
  ]
}
```

## Hash Chain Verification

### Verification Endpoint
```
GET /api/admin/audit/verify?startSeq={seq}&endSeq={seq}
```

### Response (Valid Chain)
```json
{
  "success": true,
  "verifiedAt": "2024-06-15T10:30:00Z",
  "range": { "startSeq": "1", "endSeq": "10000" },
  "result": {
    "valid": true,
    "totalVerified": 10000,
    "brokenAt": null,
    "message": "Hash chain integrity verified successfully."
  }
}
```

### Response (Broken Chain)
```json
{
  "success": true,
  "verifiedAt": "2024-06-15T10:30:00Z",
  "range": { "startSeq": "1", "endSeq": "10000" },
  "result": {
    "valid": false,
    "totalVerified": 5432,
    "brokenAt": "evt_5433",
    "message": "Hash chain broken at event ID: evt_5433"
  }
}
```

## Admin UI

Access the audit tools at `/admin/audit-tools`:

1. **Export Panel**: Download audit events in JSON or CSV format
2. **Reconstruct Panel**: Compute historical market state
3. **Verify Panel**: Check hash chain integrity
4. **Event Browser**: Search and inspect individual events

## Security & Access Control

- All audit endpoints require `audit:read` permission
- Hash verification restricted to `super_admin` and `admin` roles
- Audit events cannot be modified via any admin interface
- Rate limiting prevents abuse of export endpoints

## Compliance Notes

1. **Retention**: Default 7-year retention aligns with CFTC/SEC requirements
2. **Immutability**: Database constraints prevent UPDATE/DELETE on audit tables
3. **Traceability**: Every state change links to actor, timestamp, and reason
4. **Reproducibility**: Any market state can be reconstructed from event replay
5. **Tamper Evidence**: Hash chain detects unauthorized modifications

---

*Document Version: 1.0*
*Last Updated: 2024-06-15*
