# Fee Accrual: Protocol Revenue Distribution

## Overview

AEGIS generates revenue through multiple fee mechanisms. Fees are distributed to lenders (sL holders), the protocol treasury, and keepers. Understanding fee flows is critical for accurate share price calculations.

## Fee Sources

### 1. Swap Fees

Captured from Uniswap V4 swaps via hook:

```solidity
function afterSwap(
    address,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    BalanceDelta delta,
    bytes calldata
) external returns (bytes4, int128) {
    // Calculate fee based on swap volume
    int128 fee = _calculateSwapFee(delta, params);

    // Distribute to lenders
    _accrueToLenders(key, fee);

    return (this.afterSwap.selector, fee);
}
```

### 2. Borrow Fees

One-time fee on new borrows:

```solidity
function _applyBorrowFee(uint256 borrowAmountL)
    internal returns (uint256 feeL)
{
    feeL = FullMath.mulDiv(
        borrowAmountL,
        BORROW_FEE_PIPS,  // e.g., 5,000 = 0.5%
        PIPS_DENOMINATOR
    );

    // Add fee to lender equity
    marketState.equityLWad += feeL;

    emit BorrowFeeCollected(borrowAmountL, feeL);

    return feeL;
}
```

### 3. Interest Accrual

Continuous interest on outstanding debt:

```solidity
function _accrueInterest() internal {
    uint256 timeElapsed = block.timestamp - lastAccrualTime;
    if (timeElapsed == 0) return;

    // Calculate accrued interest
    uint256 interestRate = _getInterestRate();
    uint256 accruedInterest = FullMath.mulDiv(
        totalDebtL,
        interestRate * timeElapsed,
        SECONDS_PER_YEAR * PIPS_DENOMINATOR
    );

    // Add to lender equity (NOT to debt principal - equity neutrality)
    marketState.equityLWad += accruedInterest;
    lastAccrualTime = block.timestamp;

    emit InterestAccrued(accruedInterest);
}
```

### 4. Liquidation Fees

Penalty on liquidated positions:

```solidity
function _applyLiquidationFee(uint256 collateralL)
    internal returns (uint256 protocolFee, uint256 keeperReward)
{
    // Keeper gets immediate reward
    keeperReward = FullMath.mulDiv(
        collateralL,
        KEEPER_REWARD_PIPS,  // e.g., 50,000 = 5%
        PIPS_DENOMINATOR
    );

    // Protocol gets additional fee
    protocolFee = FullMath.mulDiv(
        collateralL,
        PROTOCOL_FEE_PIPS,  // e.g., 10,000 = 1%
        PIPS_DENOMINATOR
    );

    // Protocol fee goes to treasury
    _transferToTreasury(protocolFee);
}
```

## Fee Distribution

### To Lenders (sL Holders)

Fees increase `equityLWad`, which increases share price:

```solidity
// Before fee: sharePrice = equityLWad / totalShares
// After fee:  sharePrice = (equityLWad + fee) / totalShares

function _accrueToLenders(uint256 feeL) internal {
    marketState.equityLWad += feeL;
    // Share price automatically increases
    // No explicit distribution needed
}
```

### To Protocol Treasury

Direct transfer of protocol's share:

```solidity
function _distributeProtocolFee(uint256 feeAmount) internal {
    // Split: 80% lenders, 20% protocol
    uint256 protocolShare = FullMath.mulDiv(
        feeAmount,
        PROTOCOL_FEE_SHARE_PIPS,  // 200,000 = 20%
        PIPS_DENOMINATOR
    );
    uint256 lenderShare = feeAmount - protocolShare;

    // Lender share increases equity
    marketState.equityLWad += lenderShare;

    // Protocol share goes to treasury
    _mintToTreasury(protocolShare);
}
```

### To Keepers

Immediate rewards for maintenance operations:

```solidity
function _rewardKeeper(address keeper, uint256 rewardL) internal {
    // Convert L-units to tokens
    (uint256 amount0, uint256 amount1) = LMath.getAmountsFromL(rewardL, ...);

    // Transfer tokens
    token0.transfer(keeper, amount0);
    token1.transfer(keeper, amount1);

    emit KeeperRewarded(keeper, amount0, amount1);
}
```

## Share Price Mechanics

### Share Price Formula

```solidity
function getSharePrice() public view returns (uint256) {
    if (totalShares == 0) return WAD;  // 1:1 initially

    // sharePrice = equityLWad * WAD / totalShares
    return FullMath.mulDiv(
        marketState.equityLWad,
        WAD,
        totalShares
    );
}
```

### Share Price Invariants

1. **Never decreases** (except for bad debt)
2. **Increases with fees**
3. **Unaffected by borrows/repays** (equity neutrality)

### Tracking Fee Impact

```solidity
function getAccumulatedFees() public view returns (
    uint256 swapFees,
    uint256 borrowFees,
    uint256 interestFees
) {
    return (
        accumulatedSwapFees,
        accumulatedBorrowFees,
        accumulatedInterestFees
    );
}

function getCurrentAPY() public view returns (uint256) {
    uint256 annualizedFees = _projectAnnualFees();
    return FullMath.mulDiv(
        annualizedFees,
        PIPS_DENOMINATOR,
        marketState.equityLWad
    );
}
```

## Fee Residue Handling

Small fee amounts that can't be evenly distributed:

```solidity
function _handleFeeResidue(uint256 fee, uint256 divisor) internal {
    uint256 distributed = (fee / divisor) * divisor;
    uint256 residue = fee - distributed;

    if (residue > 0) {
        // Accumulate residue until it's significant
        feeResidue += residue;

        if (feeResidue >= MIN_FEE_DISTRIBUTION) {
            _distributeResidue();
        }
    }
}
```

## Dynamic Fee Rates

### Utilization-Based Interest

```solidity
function _getInterestRate() internal view returns (uint256) {
    uint256 utilization = _getUtilization();

    if (utilization <= OPTIMAL_UTILIZATION) {
        // Linear increase up to optimal
        return FullMath.mulDiv(
            utilization,
            BASE_RATE,
            OPTIMAL_UTILIZATION
        );
    } else {
        // Steep increase above optimal
        uint256 excessUtil = utilization - OPTIMAL_UTILIZATION;
        uint256 maxExcess = PIPS_DENOMINATOR - OPTIMAL_UTILIZATION;
        return BASE_RATE + FullMath.mulDiv(
            excessUtil,
            MAX_RATE - BASE_RATE,
            maxExcess
        );
    }
}
```

### Dynamic Swap Fees

```solidity
function getFee(PoolKey calldata key) external view returns (uint24) {
    uint256 utilization = _getUtilization();

    // Higher utilization = higher fees (incentivize deposits)
    uint24 dynamicFee = uint24(FullMath.mulDiv(
        utilization,
        MAX_DYNAMIC_FEE,
        PIPS_DENOMINATOR
    ));

    return BASE_SWAP_FEE + dynamicFee;
}
```

## Events

```solidity
event SwapFeeCollected(bytes32 indexed poolId, uint256 fee0, uint256 fee1);
event BorrowFeeCollected(uint256 borrowAmount, uint256 fee);
event InterestAccrued(uint256 interest);
event ProtocolFeeWithdrawn(address indexed to, uint256 amount);
event SharePriceUpdated(uint256 oldPrice, uint256 newPrice);
```

## Related Concepts

- [L-Units](../concepts/l-units.md) - Fee accounting units
- [PIPS](../concepts/pips.md) - Fee rate precision
- [Equity Neutrality](../gotchas/equity-neutrality.md) - Fee vs borrow distinction
