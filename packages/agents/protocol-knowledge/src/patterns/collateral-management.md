# Collateral Management: SAFE Multi-NFT Algorithm

## Overview

AEGIS uses the SAFE (Summed Adjusted Floor Evaluation) algorithm to manage multiple collateral positions. This enables users to collateralize with multiple Uniswap V4 LP positions while maintaining safety.

## Single vs Multi-Position

### Single Position

```
Vault has 1 LP position
    ↓
Calculate sqrt(K) for that position
    ↓
Compare to debt requirement
```

### Multi-Position (SAFE)

```
Vault has N LP positions
    ↓
Calculate sqrt(K) for each position
    ↓
Sum all sqrt(K) values with risk adjustment
    ↓
Compare summed value to debt requirement
```

## SAFE Algorithm

### Core Formula

```solidity
function calculateSAFECollateral(
    uint256[] memory positionIds
) public view returns (uint256 totalSqrtK) {
    for (uint256 i = 0; i < positionIds.length; i++) {
        Position memory pos = getPosition(positionIds[i]);

        // Calculate sqrt(K) for this position
        uint256 sqrtK = _calculateSqrtK(pos);

        // Apply concentration risk adjustment
        uint256 adjustedSqrtK = _applyConcentrationFactor(sqrtK, pos);

        totalSqrtK += adjustedSqrtK;
    }
}
```

### Concentration Risk Factor

Positions with narrower ranges have higher risk:

```solidity
function _applyConcentrationFactor(
    uint256 sqrtK,
    Position memory pos
) internal pure returns (uint256) {
    // Calculate tick range
    int24 tickRange = pos.tickUpper - pos.tickLower;

    // Wider range = lower risk = higher factor
    uint256 concentrationFactor;
    if (tickRange >= WIDE_RANGE_THRESHOLD) {
        concentrationFactor = PIPS_DENOMINATOR;  // 100%
    } else if (tickRange >= MEDIUM_RANGE_THRESHOLD) {
        concentrationFactor = 900_000;  // 90%
    } else {
        concentrationFactor = 800_000;  // 80%
    }

    return FullMath.mulDiv(sqrtK, concentrationFactor, PIPS_DENOMINATOR);
}
```

## Position Operations

### Adding Collateral

```solidity
function addCollateralPosition(
    uint256 vaultId,
    uint256 positionId
) external {
    // Transfer position to protocol
    positionManager.safeTransferFrom(
        msg.sender,
        address(this),
        positionId
    );

    // Add to vault's position list
    vaultPositions[vaultId].push(positionId);

    // Update collateral value
    uint256 sqrtK = _calculateSqrtK(positionId);
    vaults[vaultId].totalSqrtK += sqrtK;

    emit CollateralAdded(vaultId, positionId, sqrtK);
}
```

### Removing Collateral

```solidity
function removeCollateralPosition(
    uint256 vaultId,
    uint256 positionId
) external {
    require(ownerOf(vaultId) == msg.sender, "Not owner");

    // Calculate new collateral value
    uint256 sqrtK = _calculateSqrtK(positionId);
    uint256 newTotalSqrtK = vaults[vaultId].totalSqrtK - sqrtK;

    // Check if still safe
    require(
        _isSafe(newTotalSqrtK, vaults[vaultId].debtL),
        "Would undercollateralize"
    );

    // Remove from position list
    _removeFromList(vaultPositions[vaultId], positionId);

    // Update state
    vaults[vaultId].totalSqrtK = newTotalSqrtK;

    // Transfer position back
    positionManager.safeTransferFrom(
        address(this),
        msg.sender,
        positionId
    );

    emit CollateralRemoved(vaultId, positionId, sqrtK);
}
```

## Position Valuation

### sqrt(K) Calculation

```solidity
function _calculateSqrtK(uint256 positionId)
    internal view returns (uint256)
{
    Position memory pos = positionManager.positions(positionId);

    // Get current amounts in position
    (uint256 amount0, uint256 amount1) = _getPositionAmounts(pos);

    // sqrt(K) = sqrt(amount0 * amount1)
    return Math.sqrt(amount0 * amount1);
}
```

### Handling Out-of-Range Positions

```solidity
function _getPositionAmounts(Position memory pos)
    internal view returns (uint256 amount0, uint256 amount1)
{
    int24 currentTick = pool.slot0().tick;

    if (currentTick < pos.tickLower) {
        // Position is entirely in token0
        amount0 = _getAmount0ForLiquidity(pos);
        amount1 = 0;
    } else if (currentTick >= pos.tickUpper) {
        // Position is entirely in token1
        amount0 = 0;
        amount1 = _getAmount1ForLiquidity(pos);
    } else {
        // Position is in range
        (amount0, amount1) = _getAmountsForLiquidity(pos, currentTick);
    }
}
```

## Correlation Risk

### Same-Pool Positions

Multiple positions in the same pool are fully correlated:

```solidity
function _assessPoolCorrelation(
    uint256[] memory positionIds
) internal view returns (uint256 correlationDiscount) {
    // Group by pool
    mapping(bytes32 => uint256) poolCounts;
    for (uint256 i = 0; i < positionIds.length; i++) {
        bytes32 poolKey = _getPoolKey(positionIds[i]);
        poolCounts[poolKey]++;
    }

    // Apply discount for concentrated risk
    for each pool with count > 1 {
        correlationDiscount += CORRELATION_PENALTY * (count - 1);
    }
}
```

### Cross-Pool Diversification

Positions in different pools get diversification benefit:

```solidity
function _assessDiversification(
    uint256[] memory positionIds
) internal view returns (uint256 diversificationBonus) {
    uint256 uniquePools = _countUniquePools(positionIds);

    if (uniquePools >= 3) {
        diversificationBonus = 50_000;  // 5% bonus
    } else if (uniquePools >= 2) {
        diversificationBonus = 25_000;  // 2.5% bonus
    }
}
```

## Rebalancing

### When to Rebalance

Monitor positions for:

- Price moving out of range
- Concentration risk increasing
- Better yield opportunities

### Rebalancing Flow

```solidity
function rebalanceCollateral(
    uint256 vaultId,
    uint256[] calldata removeIds,
    uint256[] calldata addIds
) external {
    require(ownerOf(vaultId) == msg.sender, "Not owner");

    // Calculate new state
    uint256 newSqrtK = vaults[vaultId].totalSqrtK;

    for (uint256 i = 0; i < removeIds.length; i++) {
        newSqrtK -= _calculateSqrtK(removeIds[i]);
    }
    for (uint256 i = 0; i < addIds.length; i++) {
        newSqrtK += _calculateSqrtK(addIds[i]);
    }

    // Verify still safe
    require(_isSafe(newSqrtK, vaults[vaultId].debtL), "Unsafe");

    // Execute transfers
    _executeRebalance(vaultId, removeIds, addIds);
}
```

## View Functions

### Get Vault Health

```solidity
function getVaultHealth(uint256 vaultId)
    external view returns (
        uint256 collateralValue,
        uint256 debtValue,
        uint256 healthFactor,
        bool isLiquidatable
    )
{
    Vault memory vault = vaults[vaultId];

    collateralValue = vault.totalSqrtK;
    debtValue = _getDebtSqrtK(vault.debtL);

    if (debtValue > 0) {
        healthFactor = FullMath.mulDiv(
            collateralValue,
            PIPS_DENOMINATOR,
            debtValue
        );
    } else {
        healthFactor = type(uint256).max;
    }

    isLiquidatable = healthFactor < LIQUIDATION_THRESHOLD_PIPS;
}
```

### Get Position Details

```solidity
function getPositionDetails(uint256 positionId)
    external view returns (
        address pool,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 sqrtK,
        bool inRange
    )
{
    Position memory pos = positionManager.positions(positionId);

    pool = pos.pool;
    tickLower = pos.tickLower;
    tickUpper = pos.tickUpper;
    liquidity = pos.liquidity;
    sqrtK = _calculateSqrtK(positionId);

    int24 currentTick = IPool(pool).slot0().tick;
    inRange = currentTick >= tickLower && currentTick < tickUpper;
}
```

## Related Concepts

- [sqrt(K) Floor](../concepts/sqrt-k-floor.md) - Base collateral formula
- [Vault Operations](./vault-operations.md) - Core vault flows
- [Keeper Flows](./keeper-flows.md) - Liquidation handling
