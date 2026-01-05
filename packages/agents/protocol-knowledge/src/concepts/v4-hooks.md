# Uniswap V4 Hooks: AEGIS Integration

## Overview

AEGIS integrates with Uniswap V4 through the hook system. The `AegisHook` contract implements specific hook callbacks to intercept and augment pool operations.

## V4 Hook Basics

### Hook Lifecycle

```
User Action
    ↓
Router.execute()
    ↓
PoolManager.unlock()
    ↓
PoolManager.[operation]()
    ↓
Hook.before[Operation]() ← AEGIS intercepts here
    ↓
Core Pool Logic
    ↓
Hook.after[Operation]() ← AEGIS intercepts here
    ↓
Return to User
```

### Available Hooks

| Hook | Before | After | AEGIS Uses |
|------|--------|-------|------------|
| Initialize | ✅ | ✅ | ✅ Setup |
| Swap | ✅ | ✅ | ✅ Fee capture |
| ModifyLiquidity | ✅ | ✅ | ✅ Liquidity tracking |
| Donate | ✅ | ✅ | ❌ |

### Hook Flags

```solidity
// AEGIS Hook Flags (example)
Hooks.Permissions({
    beforeInitialize: true,
    afterInitialize: true,
    beforeSwap: true,
    afterSwap: true,
    beforeModifyLiquidity: true,
    afterModifyLiquidity: true,
    beforeDonate: false,
    afterDonate: false
})
```

## AegisHook Implementation

### Pool Initialization

```solidity
function beforeInitialize(
    address sender,
    PoolKey calldata key,
    uint160 sqrtPriceX96
) external override returns (bytes4) {
    // Validate pool configuration
    _validatePoolKey(key);

    // Initialize AEGIS market state
    _initializeMarket(key);

    return this.beforeInitialize.selector;
}
```

### Swap Hooks

```solidity
function beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external override returns (bytes4, BeforeSwapDelta, uint24) {
    // Check if swap affects AEGIS positions
    _checkSwapImpact(key, params);

    // Apply dynamic fees if enabled
    uint24 dynamicFee = _calculateDynamicFee(key, params);

    return (
        this.beforeSwap.selector,
        BeforeSwapDeltaLibrary.ZERO_DELTA,
        dynamicFee
    );
}

function afterSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata hookData
) external override returns (bytes4, int128) {
    // Capture fees for lenders
    int128 hookDelta = _captureSwapFees(key, delta);

    // Update market state
    _updateMarketAfterSwap(key, delta);

    return (this.afterSwap.selector, hookDelta);
}
```

### Liquidity Hooks

```solidity
function beforeModifyLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    bytes calldata hookData
) external override returns (bytes4) {
    // Validate liquidity operation
    if (params.liquidityDelta > 0) {
        // Adding liquidity - check market capacity
        _checkMarketCapacity(key, params);
    } else {
        // Removing liquidity - check collateral requirements
        _checkCollateralAfterRemoval(key, params);
    }

    return this.beforeModifyLiquidity.selector;
}
```

## Hook Data Pattern

### Encoding Hook Data

```solidity
// In Router
bytes memory hookData = abi.encode(
    HookData({
        sessionId: currentSession,
        vaultId: userVault,
        action: ActionType.BORROW
    })
);

poolManager.swap(key, params, hookData);
```

### Decoding in Hook

```solidity
function afterSwap(..., bytes calldata hookData) external {
    HookData memory data = abi.decode(hookData, (HookData));

    // Use hook data for AEGIS-specific logic
    if (data.action == ActionType.BORROW) {
        _processBorrowSwap(data.vaultId, delta);
    }
}
```

## Fee Capture

### Dynamic Fee Hook

```solidity
function getFee(
    address sender,
    PoolKey calldata key
) external view returns (uint24) {
    // Base fee + dynamic adjustment
    uint24 baseFee = key.fee;
    uint24 dynamicAdjustment = _calculateUtilizationFee(key);

    return baseFee + dynamicAdjustment;
}
```

### Fee Distribution

```solidity
function _captureSwapFees(
    PoolKey calldata key,
    BalanceDelta delta
) internal returns (int128) {
    // Calculate protocol's share
    int256 fee0 = _calculateFeeShare(delta.amount0());
    int256 fee1 = _calculateFeeShare(delta.amount1());

    // Distribute to lenders
    _distributeFees(key, fee0, fee1);

    // Return hook's delta (fees taken)
    return int128(fee0 + fee1);
}
```

## Integration with AEGIS Engine

### Session-Aware Hooks

```solidity
function beforeSwap(...) external {
    // Get current session from transient storage
    Session memory session = _getCurrentSession();

    if (session.active) {
        // Within session - apply session rules
        _applySessionRules(session, params);
    } else {
        // Regular swap - standard processing
        _processStandardSwap(params);
    }
}
```

### Engine Callbacks

```solidity
// Hook calls back to Engine
function afterModifyLiquidity(...) external {
    IAegisEngine(engine).onLiquidityModified(
        key,
        params.liquidityDelta,
        hookData
    );
}
```

## Security Considerations

### Callback Validation

```solidity
modifier onlyPoolManager() {
    require(msg.sender == address(poolManager), "Not PM");
    _;
}

function beforeSwap(...) external onlyPoolManager {
    // Safe - called by PoolManager
}
```

### Reentrancy in Hooks

```solidity
// Hooks are called during PM operations
// External calls from hooks can cause reentrancy
function afterSwap(...) external {
    // Safe: read-only external call
    uint256 price = oracle.getPrice();

    // Risky: state-changing external call
    // externalContract.update(); // Avoid!
}
```

## Testing Hooks

### Foundry Setup

```solidity
function setUp() public {
    // Deploy with hook flags
    address hookAddress = address(
        uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG)
    );

    deployCodeTo("AegisHook.sol", hookAddress);
    hook = AegisHook(hookAddress);
}
```

### Testing Hook Behavior

```solidity
function test_hookCapturesFees() public {
    // Perform swap
    poolManager.swap(key, params, hookData);

    // Verify fees captured
    assertGt(hook.accumulatedFees(key), 0);
}
```

## Related Concepts

- [Two-Phase Execution](./two-phase-execution.md) - PM locked/unlocked
- [Session Lifecycle](../patterns/session-lifecycle.md) - Session management
- [Fee Accrual](../patterns/fee-accrual.md) - Fee distribution
