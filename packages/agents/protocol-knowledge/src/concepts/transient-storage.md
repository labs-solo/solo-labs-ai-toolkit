# Transient Storage: EIP-1153 in AEGIS

## Overview

Transient storage (EIP-1153) provides temporary storage that persists only for the duration of a transaction. AEGIS uses it extensively for session-scoped state management.

## EIP-1153 Basics

### Operations

| Opcode | Operation | Gas Cost |
|--------|-----------|----------|
| `TSTORE` | Write transient slot | 100 gas |
| `TLOAD` | Read transient slot | 100 gas |

Compare to regular storage:

- `SSTORE` (cold): 20,000+ gas
- `SLOAD` (cold): 2,100 gas

### Lifetime

```
Transaction Start
    ↓
TSTORE writes data
    ↓
TLOAD reads data (same transaction)
    ↓
Transaction End → All transient data cleared
```

## AEGIS Transient Storage Layout

### Session Slots

```solidity
// Slot definitions (simplified)
uint256 constant SESSION_ACTIVE_SLOT = 0x01;
uint256 constant SESSION_OWNER_SLOT = 0x02;
uint256 constant ACCUMULATED_DELTA_SLOT = 0x03;
uint256 constant REENTRANCY_GUARD_SLOT = 0x04;
```

### Data Stored

| Slot | Data | Purpose |
|------|------|---------|
| `SESSION_ACTIVE` | bool | Is session in progress |
| `SESSION_OWNER` | address | Who started session |
| `DELTA_AMOUNT0` | int256 | Token 0 running total |
| `DELTA_AMOUNT1` | int256 | Token 1 running total |
| `PENDING_OPS` | bytes | Queued operations |

## Usage Patterns

### Session Guard

```solidity
modifier onlyDuringSession() {
    require(tload(SESSION_ACTIVE_SLOT) == 1, "No active session");
    _;
}

function startSession() internal {
    require(tload(SESSION_ACTIVE_SLOT) == 0, "Session exists");
    tstore(SESSION_ACTIVE_SLOT, 1);
    tstore(SESSION_OWNER_SLOT, uint256(uint160(msg.sender)));
}

function endSession() internal {
    tstore(SESSION_ACTIVE_SLOT, 0);
    tstore(SESSION_OWNER_SLOT, 0);
}
```

### Delta Accumulation

```solidity
function accumulateDelta(int256 amount0, int256 amount1) internal {
    int256 current0 = int256(tload(DELTA_AMOUNT0_SLOT));
    int256 current1 = int256(tload(DELTA_AMOUNT1_SLOT));

    tstore(DELTA_AMOUNT0_SLOT, uint256(current0 + amount0));
    tstore(DELTA_AMOUNT1_SLOT, uint256(current1 + amount1));
}

function getAccumulatedDeltas() internal view returns (int256, int256) {
    return (
        int256(tload(DELTA_AMOUNT0_SLOT)),
        int256(tload(DELTA_AMOUNT1_SLOT))
    );
}
```

### Reentrancy Protection

```solidity
modifier nonReentrantTransient() {
    require(tload(REENTRANCY_GUARD_SLOT) == 0, "Reentrant call");
    tstore(REENTRANCY_GUARD_SLOT, 1);
    _;
    tstore(REENTRANCY_GUARD_SLOT, 0);
}
```

## Benefits in AEGIS

### Gas Efficiency

Session state changes frequently:

- Multiple operations per session
- State cleared at end anyway
- Transient saves ~20,000 gas per operation

### Automatic Cleanup

No need to manually clear:

- Session state auto-clears
- No storage slot pollution
- No orphaned data

### Reentrancy Safety

Natural protection:

- Guard resets at transaction end
- Can't persist malicious state
- Clean slate each transaction

## Limitations

### No Persistence

Data doesn't survive:

- Transaction end
- External calls (if they return)
- Reverts (entire transaction)

### No Cross-Transaction Access

Cannot:

- Read previous transaction's transient data
- Store data for future transactions
- Use as cache across calls

### Assembly Required

In Solidity, need inline assembly:

```solidity
function tstore(uint256 slot, uint256 value) internal {
    assembly {
        tstore(slot, value)
    }
}

function tload(uint256 slot) internal view returns (uint256 value) {
    assembly {
        value := tload(slot)
    }
}
```

## Debugging Transient Storage

### In Foundry Tests

```solidity
// Can't directly read transient storage in tests
// Use wrapper functions that expose values
function getSessionState() external view returns (bool active, address owner) {
    active = tload(SESSION_ACTIVE_SLOT) == 1;
    owner = address(uint160(tload(SESSION_OWNER_SLOT)));
}
```

### Common Issues

1. **Reading after transaction**: Data is gone
2. **Assuming persistence**: State won't be there next call
3. **Slot collisions**: Use unique slot constants
4. **Type confusion**: Cast carefully between types

## Security Considerations

### Slot Isolation

Use unique slots per logical variable:

```solidity
// Good: Unique slots
uint256 constant SLOT_A = keccak256("aegis.session.slotA");
uint256 constant SLOT_B = keccak256("aegis.session.slotB");

// Bad: Sequential slots (collision risk)
uint256 constant SLOT_A = 1;
uint256 constant SLOT_B = 2;
```

### Cross-Contract Safety

Transient storage is per-contract:

- Can't read other contract's transient data
- External calls don't share transient state
- Safe from cross-contract interference

## Related Concepts

- [Two-Phase Execution](./two-phase-execution.md) - When transient storage is used
- [Session Lifecycle](../patterns/session-lifecycle.md) - Session management
- [Reentrancy Risks](../gotchas/reentrancy-risks.md) - Protection patterns
