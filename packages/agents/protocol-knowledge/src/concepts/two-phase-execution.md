# Two-Phase Execution: PM Locked vs Unlocked

## Overview

AEGIS uses a two-phase execution model based on Uniswap V4's PoolManager callback pattern. Understanding when the PoolManager is locked vs unlocked is critical for safe contract interactions.

## The Two Phases

### Phase 0: PM Locked

The PoolManager is locked (within a callback):

- Direct pool operations available
- Can swap, mint/burn liquidity
- Transient storage active
- Must complete before returning

### Phase 1: PM Unlocked

The PoolManager is unlocked (normal execution):

- Cannot directly access pool operations
- Must go through unlock pattern
- Prepare operations for Phase 0
- Handle external interactions

## Execution Flow

```
User Call (Phase 1)
    ↓
Router.execute()
    ↓
PoolManager.unlock()
    ↓
unlockCallback() [Phase 0 begins]
    ↓
    ├── AegisEngine.executeSession()
    ├── Swap/Mint/Burn operations
    └── State updates
    ↓
[Phase 0 ends]
    ↓
Return to Phase 1
    ↓
Return to User
```

## What Can Happen in Each Phase

### Phase 0 Operations

| Operation | Available | Notes |
|-----------|-----------|-------|
| Pool swaps | ✅ | Direct via PoolManager |
| Mint liquidity | ✅ | Via hook callback |
| Burn liquidity | ✅ | Via hook callback |
| Transient storage | ✅ | Session state |
| External calls | ⚠️ | Reentrancy risk |
| Token transfers | ✅ | Via PoolManager |

### Phase 1 Operations

| Operation | Available | Notes |
|-----------|-----------|-------|
| Pool swaps | ❌ | Must unlock first |
| NFT transfers | ✅ | ERC-721 ops |
| External calls | ✅ | Safe to call out |
| View functions | ✅ | Read state |
| Setup/validation | ✅ | Prepare for Phase 0 |

## Session Lifecycle

### Session Start (Phase 1 → Phase 0)

```solidity
// Phase 1: Setup
function executeVaultAction(bytes calldata data) external {
    // Validation in Phase 1
    require(msg.sender == owner, "Not owner");

    // Transition to Phase 0
    poolManager.unlock(abi.encode(data));
}

// Phase 0: Execution
function unlockCallback(bytes calldata data) external {
    // Now in Phase 0
    _startSession();
    _executeActions(data);
    _endSession();
}
```

### Session End (Phase 0 → Phase 1)

```solidity
function _endSession() internal {
    // Still in Phase 0
    _settleBalances();
    _clearTransientStorage();
    // Return control - Phase 1 resumes
}
```

## Transient Storage Usage

Transient storage (EIP-1153) is only valid during Phase 0:

```solidity
// Phase 0 only
tstore(SESSION_SLOT, sessionData)  // Write
tload(SESSION_SLOT)                 // Read

// Automatically cleared when Phase 0 ends
```

### What to Store Transiently

- Session identifiers
- Accumulated deltas
- Temporary calculations
- Re-entrancy guards

### What NOT to Store Transiently

- Persistent state
- Audit logs
- User balances
- Anything needed after callback returns

## Common Patterns

### Safe External Calls

```solidity
function processWithExternalCall() external {
    // Phase 1: Make external call
    uint256 data = externalContract.getData();

    // Transition to Phase 0 with data
    poolManager.unlock(abi.encode(data));
}
```

### Deferred Operations

```solidity
function unlockCallback(bytes calldata data) external {
    // Phase 0: Execute pool operations
    _executePoolOps(data);

    // Queue actions for Phase 1
    _queuePostSessionActions();
}

function executeQueuedActions() external {
    // Phase 1: Process queued items
    _processQueue();
}
```

## Security Considerations

### Reentrancy in Phase 0

- External calls during Phase 0 are risky
- Callbacks could re-enter
- Use transient reentrancy guards

```solidity
function unlockCallback(bytes calldata data) external {
    require(tload(REENTRANCY_GUARD) == 0, "Reentrant");
    tstore(REENTRANCY_GUARD, 1);

    // ... operations ...

    tstore(REENTRANCY_GUARD, 0);
}
```

### State Consistency

- Don't assume state persists across phases
- Transient storage clears automatically
- Validate state at phase transitions

## Debugging Tips

1. **Identify current phase**: Check if in unlock callback
2. **Trace phase transitions**: Log enter/exit
3. **Verify transient storage**: Check values within Phase 0
4. **Test reentrancy**: Attempt malicious callbacks

## Related Concepts

- [Transient Storage](./transient-storage.md) - EIP-1153 details
- [Session Lifecycle](../patterns/session-lifecycle.md) - Full session flow
- [Reentrancy Risks](../gotchas/reentrancy-risks.md) - Security patterns
