---
name: gen-subgraph-handler
description: Generate AssemblyScript event handlers for AEGIS Protocol subgraph indexing
agents: subgraph-developer, assemblyscript-expert
---

# Generate Subgraph Handler Command

Generate production-ready AssemblyScript event handlers for The Graph subgraph.

## Handler Templates

### 1. Standard Event Handler

```bash
/gen-subgraph-handler --event VaultCreated --entity Vault
```

Generates:

- Event handler function with proper typing
- Entity creation/update logic
- Related entity updates (User, Market, ProtocolStats)
- Transaction record creation
- Proper null checks and error handling

### 2. Batch Handler

```bash
/gen-subgraph-handler --events VaultUpdated,Borrow,Repay --entity Vault
```

Generates multiple related handlers with shared utilities.

### 3. Liquidation Handler

```bash
/gen-subgraph-handler --event VaultLiquidated --type liquidation
```

Generates specialized handler for liquidation events including:

- Keeper action tracking
- Protocol fee calculation
- User liquidation count updates
- Protocol stats updates

## Handler Structure

### Standard Handler Pattern

```typescript
import { BigInt, log } from '@graphprotocol/graph-ts';
import { EventName } from '../generated/AegisEngine/AegisEngine';
import { Entity, RelatedEntity, Transaction } from '../generated/schema';

export function handleEventName(event: EventName): void {
  // 1. Load or create primary entity
  let entityId = event.params.primaryId.toString();
  let entity = Entity.load(entityId);

  if (entity == null) {
    log.error('Entity {} not found in handleEventName', [entityId]);
    return;
  }

  // 2. Extract event parameters
  let param1 = event.params.param1;
  let param2 = event.params.param2;

  // 3. Store previous state for transaction record
  let previousValue = entity.value;

  // 4. Update entity
  entity.value = param1;
  entity.lastUpdated = event.block.timestamp;
  entity.save();

  // 5. Update related entities
  updateRelatedEntities(entity);

  // 6. Create transaction record
  createTransactionRecord(event, entityId, 'EVENT_TYPE', param1, previousValue);

  // 7. Update protocol stats
  updateProtocolStats(event.block.timestamp);
}
```

### Utility Functions Generated

```typescript
// Safe entity loading with creation
function getOrCreateEntity(id: string): Entity {
  let entity = Entity.load(id);
  if (entity == null) {
    entity = new Entity(id);
    // Initialize with defaults
  }
  return entity;
}

// Transaction record creation
function createTransactionRecord(
  event: ethereum.Event,
  entityId: string,
  type: string,
  amount: BigInt,
  previousAmount: BigInt,
): void {
  let txId =
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString();

  let tx = new Transaction(txId);
  tx.entity = entityId;
  tx.type = type;
  tx.amount = amount;
  tx.previousAmount = previousAmount;
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number;
  tx.txHash = event.transaction.hash;
  tx.save();
}

// Aggregate updates
function updateProtocolStats(timestamp: BigInt): void {
  let stats = ProtocolStats.load('global');
  if (stats == null) {
    stats = new ProtocolStats('global');
    stats.totalValueLockedL = BigInt.zero();
    stats.totalBorrowedL = BigInt.zero();
    // Initialize other fields
  }
  stats.lastUpdated = timestamp;
  stats.save();
}
```

## Configuration Options

```yaml
handler_config:
  # Event details
  event_name: VaultUpdated
  contract_name: AegisEngine

  # Entity mapping
  primary_entity: Vault
  related_entities: [User, Market, Transaction]

  # Field mappings
  field_mappings:
    - event_param: collateralL
      entity_field: collateralL
      type: BigInt
    - event_param: debtL
      entity_field: debtL
      type: BigInt

  # Derived calculations
  derived_fields:
    - name: ltv
      calculation: 'calculateLTV(collateralL, debtL)'
    - name: healthFactor
      calculation: 'calculateHealthFactor(ltv, maxLtvBps)'

  # Options
  options:
    create_transaction: true
    update_user_stats: true
    update_market_stats: true
    update_protocol_stats: true
    log_level: info
```

## Output Structure

```
src/handlers/
├── aegis-engine.ts      # Main handler file
├── utils/
│   ├── calculations.ts  # LTV, health factor calculations
│   ├── entities.ts      # Entity load/create helpers
│   └── stats.ts         # Aggregate stat updates
└── types/
    └── custom.ts        # Custom type definitions
```

## Usage Examples

```bash
# Generate single event handler
/gen-subgraph-handler --event VaultCreated

# Generate with custom entity mapping
/gen-subgraph-handler --event Borrow --entity Vault --transaction true

# Generate liquidation handler with keeper tracking
/gen-subgraph-handler --event VaultLiquidated --type liquidation --keeper-tracking

# Generate all vault-related handlers
/gen-subgraph-handler --events VaultCreated,VaultUpdated,Borrow,Repay,CollateralDeposited,CollateralWithdrawn

# Generate with full utility suite
/gen-subgraph-handler --event VaultUpdated --with-utils all
```

## AEGIS-Specific Handlers

### Vault Position Handler

Tracks collateral and debt changes with LTV calculation:

- Updates vault entity with new position
- Recalculates LTV in BPS
- Updates user aggregate totals
- Updates market totals

### Session Handler

Tracks EIP-1153 session lifecycle:

- Session start (aeStart)
- Session end (aeEnd)
- Phase transitions
- Operation logging

### Keeper Action Handler

Tracks keeper operations:

- Liquidation execution
- Reward distribution
- Protocol fee collection
- Keeper performance metrics
