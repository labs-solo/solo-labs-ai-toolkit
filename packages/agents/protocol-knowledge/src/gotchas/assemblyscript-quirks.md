# AssemblyScript Quirks: The Graph Development

## Overview

The Graph's subgraph handlers are written in AssemblyScript, a TypeScript-like language that compiles to WebAssembly. It has subtle but important differences from TypeScript that cause common bugs.

## Critical Differences

### 1. No undefined

**TypeScript:**

```typescript
let value: string | undefined;
if (value === undefined) { ... }
```

**AssemblyScript:**

```typescript
// undefined doesn't exist!
// Use null for nullable types
let value: string | null = null;
if (value === null) { ... }
```

### 2. No Implicit Type Coercion

**TypeScript (works):**

```typescript
let num = 5;
let str = "Value: " + num;  // Automatic conversion
```

**AssemblyScript (error):**

```typescript
let num: i32 = 5;
let str = "Value: " + num;  // ERROR!
let str = "Value: " + num.toString();  // Correct
```

### 3. Different Number Types

**AssemblyScript types:**

| Type | Description |
|------|-------------|
| i32 | 32-bit signed integer |
| u32 | 32-bit unsigned integer |
| i64 | 64-bit signed integer |
| u64 | 64-bit unsigned integer |
| f32 | 32-bit float |
| f64 | 64-bit float |

**Common mistake:**

```typescript
// TypeScript
let x = 5;  // number

// AssemblyScript
let x = 5;  // i32 (not number!)
let y: i64 = 5;  // Explicit 64-bit
```

### 4. BigInt Handling

**Padding for Hex Conversion:**

```typescript
// Wrong: Loses leading zeros
let id = event.params.id.toHexString();
// Returns "0x1" instead of "0x0000...0001"

// Correct: Pad to expected length
let id = event.params.id.toHexString().padStart(66, '0');
// Or use consistent formatting
let id = event.params.id.toHex();  // Includes 0x prefix
```

**BigInt arithmetic:**

```typescript
// Wrong: Regular operators
let sum = a + b;  // Only works if both are same type

// Correct: Use BigInt methods
let sum = a.plus(b);
let diff = a.minus(b);
let product = a.times(b);
let quotient = a.div(b);
```

### 5. Entity Loading Returns null

**Wrong:**

```typescript
let vault = Vault.load(id);
vault.balance = newBalance;  // ERROR if vault is null!
```

**Correct:**

```typescript
let vault = Vault.load(id);
if (vault === null) {
    vault = new Vault(id);
    vault.balance = BigInt.zero();
}
vault.balance = newBalance;
vault.save();
```

## Common Bugs

### 1. String Comparison with Bytes

**Wrong:**

```typescript
// Bytes and string are not directly comparable
if (event.params.action == "deposit") { ... }  // ERROR
```

**Correct:**

```typescript
// Convert Bytes to string first
let action = event.params.action.toString();
if (action == "deposit") { ... }

// Or compare as Bytes
if (event.params.action.equals(Bytes.fromUTF8("deposit"))) { ... }
```

### 2. Missing Null Checks

**Wrong:**

```typescript
export function handleTransfer(event: Transfer): void {
    let token = Token.load(event.params.tokenId.toString());
    token.owner = event.params.to;  // Crashes if token doesn't exist!
    token.save();
}
```

**Correct:**

```typescript
export function handleTransfer(event: Transfer): void {
    let id = event.params.tokenId.toString();
    let token = Token.load(id);

    if (token === null) {
        log.warning("Token {} not found", [id]);
        return;
    }

    token.owner = event.params.to;
    token.save();
}
```

### 3. BigDecimal Precision

**Wrong:**

```typescript
// Division loses precision
let ratio = amount0.div(amount1);
```

**Correct:**

```typescript
// Convert to BigDecimal for precision
let ratio = amount0.toBigDecimal().div(amount1.toBigDecimal());
```

### 4. Array Mutation

**Wrong (doesn't persist):**

```typescript
let vault = Vault.load(id)!;
vault.positions.push(newPosition);  // Creates copy, doesn't persist!
vault.save();
```

**Correct:**

```typescript
let vault = Vault.load(id)!;
let positions = vault.positions;
positions.push(newPosition);
vault.positions = positions;  // Reassign the array
vault.save();
```

### 5. Event Parameter Access

**Wrong:**

```typescript
// Accessing non-existent parameter
let value = event.params.nonExistent;  // Runtime error
```

**Correct:**

```typescript
// Check event signature matches ABI
// Use exact parameter names from contract
let value = event.params.existingParam;
```

## Matchstick Testing Patterns

### Creating Mock Events

```typescript
import { newMockEvent } from "matchstick-as";

function createDepositEvent(
    vaultId: BigInt,
    amount: BigInt
): Deposit {
    let event = changetype<Deposit>(newMockEvent());

    event.parameters = new Array();
    event.parameters.push(
        new ethereum.EventParam("vaultId", ethereum.Value.fromUnsignedBigInt(vaultId))
    );
    event.parameters.push(
        new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
    );

    return event;
}
```

### Testing Entity State

```typescript
import { assert, test, clearStore } from "matchstick-as";

test("Deposit updates vault balance", () => {
    // Setup
    let vaultId = BigInt.fromI32(1);
    let initialBalance = BigInt.fromI32(1000);

    // Create initial entity
    let vault = new Vault(vaultId.toString());
    vault.balance = initialBalance;
    vault.save();

    // Execute handler
    let event = createDepositEvent(vaultId, BigInt.fromI32(500));
    handleDeposit(event);

    // Assert
    assert.fieldEquals(
        "Vault",
        vaultId.toString(),
        "balance",
        "1500"
    );

    clearStore();
});
```

### Mocking Contract Calls

```typescript
import { createMockedFunction } from "matchstick-as";

createMockedFunction(
    Address.fromString("0x1234..."),
    "balanceOf",
    "balanceOf(address):(uint256)"
)
    .withArgs([ethereum.Value.fromAddress(userAddress)])
    .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000))]);
```

## Debugging Tips

### 1. Use Logging

```typescript
import { log } from "@graphprotocol/graph-ts";

log.info("Processing vault {}", [vaultId]);
log.warning("Unexpected state: {}", [state.toString()]);
log.error("Critical error: {}", [error]);
```

### 2. Null Safety Pattern

```typescript
function safeLoadVault(id: string): Vault {
    let vault = Vault.load(id);
    if (vault === null) {
        log.error("Vault {} not found", [id]);
        // Create empty entity or throw
        vault = new Vault(id);
    }
    return vault;
}
```

### 3. Type Conversion Helper

```typescript
function bytesToString(bytes: Bytes): string {
    return bytes.toHexString();
}

function bigIntToId(value: BigInt): string {
    return value.toHexString().padStart(66, '0');
}
```

## Schema Best Practices

### Use Derived Fields

```yaml
# schema.graphql
type Vault @entity {
  id: ID!
  positions: [Position!]! @derivedFrom(field: "vault")
}

type Position @entity {
  id: ID!
  vault: Vault!
}
```

### Consistent ID Formatting

```typescript
// Combine multiple values into ID
function createPositionId(vaultId: BigInt, index: i32): string {
    return vaultId.toString() + "-" + index.toString();
}
```

## Related Concepts

- [V4 Hooks](../concepts/v4-hooks.md) - Event sources
- [Fee Accrual](../patterns/fee-accrual.md) - Tracking in subgraph
- [Vault Operations](../patterns/vault-operations.md) - Entity modeling
