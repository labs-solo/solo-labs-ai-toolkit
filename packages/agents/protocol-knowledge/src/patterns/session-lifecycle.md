# Session Lifecycle: Managing Execution Context

## Overview

Sessions are the core execution primitive in AEGIS. Every vault operation happens within a session, which manages state transitions between Phase 0 (PM locked) and Phase 1 (PM unlocked).

## Session States

```
NONE → STARTING → ACTIVE → SETTLING → ENDED
```

### State Definitions

| State | Description | Allowed Operations |
|-------|-------------|-------------------|
| NONE | No session | Start new session |
| STARTING | Initializing | Setup only |
| ACTIVE | In progress | All vault ops |
| SETTLING | Winding down | Settlement only |
| ENDED | Complete | None (auto-clears) |

## Session Flow

### Complete Lifecycle

```
User Call
    │
    ▼
┌─────────────────────────────────────────┐
│  Phase 1: Preparation                    │
│  - Validate inputs                       │
│  - Check permissions                     │
│  - Prepare action data                   │
└─────────────────────────────────────────┘
    │
    ▼ poolManager.unlock()
    │
┌─────────────────────────────────────────┐
│  Phase 0: Execution (Session Active)     │
│  - startSession()                        │
│  - Execute vault operations              │
│  - Accumulate deltas                     │
│  - endSession()                          │
└─────────────────────────────────────────┘
    │
    ▼ return from callback
    │
┌─────────────────────────────────────────┐
│  Phase 1: Completion                     │
│  - Emit events                           │
│  - Return results                        │
└─────────────────────────────────────────┘
```

## Implementation

### Session Start

```solidity
function _startSession(uint256 vaultId) internal {
    // Verify no active session (reentrancy protection)
    require(tload(SESSION_ACTIVE_SLOT) == 0, "Session exists");

    // Initialize session state
    tstore(SESSION_ACTIVE_SLOT, 1);
    tstore(SESSION_VAULT_SLOT, vaultId);
    tstore(SESSION_OWNER_SLOT, uint256(uint160(msg.sender)));
    tstore(DELTA_AMOUNT0_SLOT, 0);
    tstore(DELTA_AMOUNT1_SLOT, 0);

    // Record session start
    sessionStartBlock = block.number;

    emit SessionStarted(vaultId, msg.sender);
}
```

### Session End

```solidity
function _endSession() internal {
    // Get accumulated deltas
    int256 delta0 = int256(tload(DELTA_AMOUNT0_SLOT));
    int256 delta1 = int256(tload(DELTA_AMOUNT1_SLOT));

    // Settle with PoolManager
    _settleDeltas(delta0, delta1);

    // Get session info before clearing
    uint256 vaultId = tload(SESSION_VAULT_SLOT);

    // Clear transient storage
    tstore(SESSION_ACTIVE_SLOT, 0);
    tstore(SESSION_VAULT_SLOT, 0);
    tstore(SESSION_OWNER_SLOT, 0);
    tstore(DELTA_AMOUNT0_SLOT, 0);
    tstore(DELTA_AMOUNT1_SLOT, 0);

    emit SessionEnded(vaultId);
}
```

### Delta Accumulation

```solidity
function _accumulateDelta(int256 amount0, int256 amount1) internal {
    require(tload(SESSION_ACTIVE_SLOT) == 1, "No session");

    int256 current0 = int256(tload(DELTA_AMOUNT0_SLOT));
    int256 current1 = int256(tload(DELTA_AMOUNT1_SLOT));

    tstore(DELTA_AMOUNT0_SLOT, uint256(current0 + amount0));
    tstore(DELTA_AMOUNT1_SLOT, uint256(current1 + amount1));
}
```

## Multi-Action Sessions

### Batching Operations

```solidity
function executeBatch(
    uint256 vaultId,
    Action[] calldata actions
) external {
    poolManager.unlock(abi.encode(vaultId, actions));
}

function unlockCallback(bytes calldata data) external {
    (uint256 vaultId, Action[] memory actions) = abi.decode(
        data,
        (uint256, Action[])
    );

    _startSession(vaultId);

    for (uint256 i = 0; i < actions.length; i++) {
        _executeAction(actions[i]);
    }

    _endSession();
}
```

### Action Types

```solidity
enum ActionType {
    DEPOSIT_COLLATERAL,
    WITHDRAW_COLLATERAL,
    BORROW,
    REPAY,
    CLAIM_REWARDS
}

struct Action {
    ActionType actionType;
    bytes data;
}

function _executeAction(Action memory action) internal {
    if (action.actionType == ActionType.DEPOSIT_COLLATERAL) {
        _depositCollateral(abi.decode(action.data, (uint256)));
    } else if (action.actionType == ActionType.BORROW) {
        _borrow(abi.decode(action.data, (uint256)));
    }
    // ... other actions
}
```

## Session Guards

### Only During Session

```solidity
modifier onlyDuringSession() {
    require(tload(SESSION_ACTIVE_SLOT) == 1, "No active session");
    _;
}

function _borrow(uint256 amount) internal onlyDuringSession {
    // Safe to execute - within session
}
```

### Session Owner Only

```solidity
modifier onlySessionOwner() {
    require(
        msg.sender == address(uint160(tload(SESSION_OWNER_SLOT))),
        "Not session owner"
    );
    _;
}
```

### Same Block Guard

```solidity
modifier sameBlock() {
    require(block.number == sessionStartBlock, "Wrong block");
    _;
}
```

## Error Handling

### Session Failures

```solidity
function unlockCallback(bytes calldata data) external {
    try this._executeSession(data) {
        // Success
    } catch Error(string memory reason) {
        // Clean up transient storage
        _clearSession();
        revert(reason);
    } catch {
        _clearSession();
        revert("Session failed");
    }
}

function _clearSession() internal {
    tstore(SESSION_ACTIVE_SLOT, 0);
    tstore(SESSION_VAULT_SLOT, 0);
    tstore(SESSION_OWNER_SLOT, 0);
    tstore(DELTA_AMOUNT0_SLOT, 0);
    tstore(DELTA_AMOUNT1_SLOT, 0);
}
```

### Partial Execution

```solidity
function executeBatchWithContinue(
    uint256 vaultId,
    Action[] calldata actions,
    bool continueOnError
) external {
    // If continueOnError, skip failed actions but continue
    for (uint256 i = 0; i < actions.length; i++) {
        if (continueOnError) {
            try this._executeAction(actions[i]) {} catch {}
        } else {
            _executeAction(actions[i]);
        }
    }
}
```

## Session Invariants

### Must Hold During Session

1. **Single active session**: Only one session per vault at a time
2. **Owner consistency**: Session owner doesn't change
3. **Delta conservation**: Deltas balance at settlement
4. **State consistency**: Transient and persistent state align

### Must Hold After Session

1. **Clean transient storage**: All session slots cleared
2. **Settled balances**: No pending deltas with PM
3. **Updated persistent state**: Changes committed

## Debugging Sessions

### Session Info View

```solidity
function getSessionInfo() external view returns (
    bool active,
    uint256 vaultId,
    address owner,
    int256 delta0,
    int256 delta1
) {
    active = tload(SESSION_ACTIVE_SLOT) == 1;
    vaultId = tload(SESSION_VAULT_SLOT);
    owner = address(uint160(tload(SESSION_OWNER_SLOT)));
    delta0 = int256(tload(DELTA_AMOUNT0_SLOT));
    delta1 = int256(tload(DELTA_AMOUNT1_SLOT));
}
```

### Common Issues

| Issue | Symptom | Cause |
|-------|---------|-------|
| Session exists | Revert on start | Reentrancy or stuck session |
| No session | Revert on operation | Forgot to start |
| Wrong owner | Revert on action | Different caller |
| Delta mismatch | Settlement fails | Accounting error |

## Events

```solidity
event SessionStarted(uint256 indexed vaultId, address indexed owner);
event SessionEnded(uint256 indexed vaultId);
event SessionFailed(uint256 indexed vaultId, string reason);
event ActionExecuted(uint256 indexed vaultId, ActionType actionType);
```

## Related Concepts

- [Two-Phase Execution](../concepts/two-phase-execution.md) - PM locked/unlocked
- [Transient Storage](../concepts/transient-storage.md) - Session state storage
- [Vault Operations](./vault-operations.md) - Operations within sessions
