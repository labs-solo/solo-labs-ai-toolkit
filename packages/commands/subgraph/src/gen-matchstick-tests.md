---
name: gen-matchstick-tests
description: Generate Matchstick unit tests for AEGIS subgraph event handlers
agents: assemblyscript-expert, subgraph-developer
---

# Generate Matchstick Tests Command

Generate comprehensive unit tests for subgraph event handlers using Matchstick testing framework.

## Test Templates

### 1. Event Handler Test

```bash
/gen-matchstick-tests --handler handleVaultCreated
```

Generates:
- Mock event creation
- Entity assertion helpers
- State before/after checks
- Edge case coverage

### 2. Integration Test Suite

```bash
/gen-matchstick-tests --handlers all --suite integration
```

Generates multi-handler interaction tests.

### 3. Calculation Test

```bash
/gen-matchstick-tests --function calculateLTV --unit
```

Generates unit tests for utility functions.

## Test Structure

### Standard Handler Test

```typescript
import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach,
  createMockedFunction,
} from 'matchstick-as/assembly/index';
import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { handleVaultCreated, handleBorrow } from '../src/aegis-engine';
import { Vault, User, Market, Transaction } from '../generated/schema';
import { createVaultCreatedEvent, createBorrowEvent } from './helpers/events';
import {
  AEGIS_ENGINE_ADDRESS,
  MOCK_OWNER,
  MOCK_MARKET_ID,
  DEFAULT_BLOCK_NUMBER,
  DEFAULT_TIMESTAMP,
} from './helpers/constants';

describe('VaultCreated Handler', () => {
  beforeEach(() => {
    // Setup initial state
    let market = new Market(MOCK_MARKET_ID);
    market.totalDepositsL = BigInt.zero();
    market.totalBorrowsL = BigInt.zero();
    market.vaultsCount = 0;
    market.maxLtvBps = 9800;
    market.hardLtvBps = 9900;
    market.save();
  });

  afterEach(() => {
    clearStore();
  });

  test('creates new vault with correct initial values', () => {
    let vaultId = BigInt.fromI32(1);
    let event = createVaultCreatedEvent(vaultId, MOCK_OWNER, MOCK_MARKET_ID);

    handleVaultCreated(event);

    // Assert vault was created
    assert.entityCount('Vault', 1);

    // Assert vault fields
    let vault = Vault.load(vaultId.toString())!;
    assert.bigIntEquals(vault.collateralL, BigInt.zero());
    assert.bigIntEquals(vault.debtL, BigInt.zero());
    assert.i32Equals(vault.ltv, 0);
    assert.booleanEquals(vault.isLocked, false);
    assert.bytesEquals(vault.owner, MOCK_OWNER);
    assert.stringEquals(vault.market, MOCK_MARKET_ID);
  });

  test('increments user vault count', () => {
    let vaultId = BigInt.fromI32(1);
    let event = createVaultCreatedEvent(vaultId, MOCK_OWNER, MOCK_MARKET_ID);

    handleVaultCreated(event);

    let user = User.load(MOCK_OWNER.toHexString())!;
    assert.i32Equals(user.vaultsCount, 1);
  });

  test('increments market vault count', () => {
    let vaultId = BigInt.fromI32(1);
    let event = createVaultCreatedEvent(vaultId, MOCK_OWNER, MOCK_MARKET_ID);

    handleVaultCreated(event);

    let market = Market.load(MOCK_MARKET_ID)!;
    assert.i32Equals(market.vaultsCount, 1);
  });

  test('handles multiple vaults for same owner', () => {
    let event1 = createVaultCreatedEvent(
      BigInt.fromI32(1),
      MOCK_OWNER,
      MOCK_MARKET_ID
    );
    let event2 = createVaultCreatedEvent(
      BigInt.fromI32(2),
      MOCK_OWNER,
      MOCK_MARKET_ID
    );

    handleVaultCreated(event1);
    handleVaultCreated(event2);

    assert.entityCount('Vault', 2);
    let user = User.load(MOCK_OWNER.toHexString())!;
    assert.i32Equals(user.vaultsCount, 2);
  });
});

describe('Borrow Handler', () => {
  beforeEach(() => {
    // Create prerequisite entities
    let market = new Market(MOCK_MARKET_ID);
    market.totalBorrowsL = BigInt.zero();
    market.maxLtvBps = 9800;
    market.save();

    let vault = new Vault('1');
    vault.owner = MOCK_OWNER;
    vault.market = MOCK_MARKET_ID;
    vault.collateralL = BigInt.fromString('1000000000000000000000'); // 1000 L
    vault.debtL = BigInt.zero();
    vault.ltv = 0;
    vault.isLocked = false;
    vault.createdAt = DEFAULT_TIMESTAMP;
    vault.lastUpdated = DEFAULT_TIMESTAMP;
    vault.save();
  });

  afterEach(() => {
    clearStore();
  });

  test('updates vault debt correctly', () => {
    let vaultId = BigInt.fromI32(1);
    let borrowAmount = BigInt.fromString('500000000000000000000'); // 500 L
    let event = createBorrowEvent(vaultId, borrowAmount);

    handleBorrow(event);

    let vault = Vault.load('1')!;
    assert.bigIntEquals(vault.debtL, borrowAmount);
  });

  test('calculates LTV correctly after borrow', () => {
    let vaultId = BigInt.fromI32(1);
    let borrowAmount = BigInt.fromString('500000000000000000000'); // 500 L
    let event = createBorrowEvent(vaultId, borrowAmount);

    handleBorrow(event);

    let vault = Vault.load('1')!;
    // 500 / 1000 * 10000 = 5000 BPS (50%)
    assert.i32Equals(vault.ltv, 5000);
  });

  test('creates transaction record', () => {
    let vaultId = BigInt.fromI32(1);
    let borrowAmount = BigInt.fromString('500000000000000000000');
    let event = createBorrowEvent(vaultId, borrowAmount);

    handleBorrow(event);

    assert.entityCount('Transaction', 1);
  });

  test('updates market total borrows', () => {
    let vaultId = BigInt.fromI32(1);
    let borrowAmount = BigInt.fromString('500000000000000000000');
    let event = createBorrowEvent(vaultId, borrowAmount);

    handleBorrow(event);

    let market = Market.load(MOCK_MARKET_ID)!;
    assert.bigIntEquals(market.totalBorrowsL, borrowAmount);
  });
});
```

### Event Helper Generation

```typescript
// tests/helpers/events.ts
import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import { VaultCreated, Borrow } from '../../generated/AegisEngine/AegisEngine';

export function createVaultCreatedEvent(
  vaultId: BigInt,
  owner: Address,
  marketId: string
): VaultCreated {
  let event = changetype<VaultCreated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      'vaultId',
      ethereum.Value.fromUnsignedBigInt(vaultId)
    )
  );
  event.parameters.push(
    new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner))
  );
  event.parameters.push(
    new ethereum.EventParam(
      'marketId',
      ethereum.Value.fromBytes(Bytes.fromHexString(marketId))
    )
  );

  return event;
}

export function createBorrowEvent(vaultId: BigInt, amount: BigInt): Borrow {
  let event = changetype<Borrow>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      'vaultId',
      ethereum.Value.fromUnsignedBigInt(vaultId)
    )
  );
  event.parameters.push(
    new ethereum.EventParam('amount', ethereum.Value.fromUnsignedBigInt(amount))
  );
  event.parameters.push(
    new ethereum.EventParam(
      'newDebt',
      ethereum.Value.fromUnsignedBigInt(amount)
    )
  );

  return event;
}
```

### Constants Helper

```typescript
// tests/helpers/constants.ts
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';

export const AEGIS_ENGINE_ADDRESS = Address.fromString(
  '0x0000000000000000000000000000000000000001'
);
export const MOCK_OWNER = Address.fromString(
  '0x0000000000000000000000000000000000000002'
);
export const MOCK_MARKET_ID = '0x0000000000000000000000000000000000000003';
export const DEFAULT_BLOCK_NUMBER = BigInt.fromI32(12345678);
export const DEFAULT_TIMESTAMP = BigInt.fromI32(1700000000);

// AEGIS Protocol constants
export const MAX_LTV_BPS = 9800;
export const HARD_LTV_BPS = 9900;
export const BPS_DENOMINATOR = BigInt.fromI32(10000);
```

## Test Categories

### 1. Happy Path Tests

- Standard event handling
- Correct entity updates
- Related entity updates
- Transaction record creation

### 2. Edge Case Tests

```typescript
test('handles zero collateral vault', () => {
  // Test LTV calculation with zero collateral
});

test('handles max LTV boundary', () => {
  // Test behavior at 98% LTV
});

test('handles liquidation threshold', () => {
  // Test behavior at 99% LTV
});
```

### 3. Error Handling Tests

```typescript
test('handles missing vault gracefully', () => {
  let event = createBorrowEvent(BigInt.fromI32(999), BigInt.fromI32(100));
  handleBorrow(event);
  // Should not create any entities
  assert.entityCount('Transaction', 0);
});
```

### 4. Calculation Tests

```typescript
describe('LTV Calculations', () => {
  test('calculates 50% LTV correctly', () => {
    let ltv = calculateLTV(
      BigInt.fromString('1000000000000000000000'),
      BigInt.fromString('500000000000000000000')
    );
    assert.i32Equals(ltv, 5000);
  });

  test('handles zero debt', () => {
    let ltv = calculateLTV(
      BigInt.fromString('1000000000000000000000'),
      BigInt.zero()
    );
    assert.i32Equals(ltv, 0);
  });

  test('handles zero collateral', () => {
    let ltv = calculateLTV(BigInt.zero(), BigInt.fromI32(100));
    assert.i32Equals(ltv, 0);
  });
});
```

## Usage Examples

```bash
# Generate tests for single handler
/gen-matchstick-tests --handler handleVaultCreated

# Generate tests for all vault handlers
/gen-matchstick-tests --handlers VaultCreated,VaultUpdated,Borrow,Repay

# Generate calculation unit tests
/gen-matchstick-tests --functions calculateLTV,calculateHealthFactor --unit

# Generate full test suite
/gen-matchstick-tests --full-suite

# Generate with coverage targets
/gen-matchstick-tests --handler handleBorrow --coverage 90
```

## Output Structure

```
tests/
├── aegis-engine.test.ts       # Main handler tests
├── calculations.test.ts        # Utility function tests
├── integration.test.ts         # Multi-handler tests
└── helpers/
    ├── events.ts               # Event creation helpers
    ├── constants.ts            # Test constants
    └── assertions.ts           # Custom assertion helpers
```
