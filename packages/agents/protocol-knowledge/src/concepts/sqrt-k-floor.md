# sqrt(K) Floor: Collateral Requirements in AEGIS

## Overview

The sqrt(K) floor is a **static, price-invariant, oracle-free** collateral bound for per-vault solvency in AEGIS. It ensures borrowers maintain sufficient collateral without relying on external price feeds.

> **Reference:** Research-0008 "√K-First Static Collateral Floor"

## The Formula

### Basic Definition

For a position with token amounts (x, y):

```
√K = floor(sqrt(x * y))
```

This is the **geometric mean** of token amounts, providing a conservative lower bound that's independent of price.

### Per-Vault Collateral (C_min)

```solidity
C_min = CollateralFloorMath.evaluateRaw(
    idleBalances,     // (idle0, idle1) in vault
    nftPositions[]    // Up to 2 attached NFTs
)
```

The collateral floor aggregates:

1. Idle token balances in the vault
2. √K from each attached NFT position

### LTV Calculation

```
LTV = (b_v * M) / C_min
```

Where:

- `b_v` = per-vault principal in √K units
- `M` = interest multiplier (accrued debt factor)
- `C_min` = collateral floor from `CollateralFloorMath`

## Why sqrt(K)?

### Problem: Price Manipulation Risk

If collateral was based on current token value:

- Attacker manipulates price via large swap
- Collateral value temporarily inflates
- Borrow against inflated value
- Price returns → protocol has bad debt

### Solution: sqrt(K) Is Price-Invariant

The √K value:

- **Constant for any price** within a full-range position
- Requires moving **BOTH** tokens proportionally to manipulate
- Cost of manipulation exceeds profit from attack
- No oracle dependency → no oracle manipulation vector

## Implementation Details

### Collateral Calculation

```solidity
struct CollateralInfo {
    uint256 sqrtKFloor;      // Minimum sqrt(K) required
    uint256 currentSqrtK;    // Current collateral value
    bool isSafe;             // currentSqrtK >= sqrtKFloor
}
```

### Multi-NFT Algorithm

For multiple collateral positions:

```solidity
totalSqrtK = sum(sqrtK_i for each NFT position)
```

The SAFE algorithm:

1. Sum sqrt(K) across all positions
2. Compare to total debt's sqrt(K) requirement
3. Account for position concentration risk

## Key Constants (BPS = basis points, 10000 = 100%)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_LTV_BPS` | 9,800 | 98% - Maximum allowed LTV |
| `HARD_LTV_BPS` | 9,900 | 99% - Hard liquidation threshold |
| `UTILIZATION_CAP_BPS` | 9,500 | 95% - Market utilization cap |
| `MAX_NFTS_PER_VAULT` | 2 | Maximum NFT positions per vault |
| `PEEL_BOUNTY_BPS` | varies | Keeper reward for peel operations |

## Collateral States

### Healthy

```
LTV = (b_v * M) / C_min < θ_L (MAX_LTV_BPS)
```

Position is safe, all operations allowed.

### Liquidatable

```
LTV ≥ θ_L (MAX_LTV_BPS = 98%)
```

Position can be liquidated by keepers via `peelOrMicroLiquidate`.

### Hard Liquidation

```
LTV ≥ θ_H (HARD_LTV_BPS = 99%)
```

Forced liquidation with maximum keeper incentive.

## Operations Affecting sqrt(K)

### Increasing Collateral

1. Deposit additional NFTs
2. Add liquidity to existing positions
3. Result: `currentSqrtK` increases

### Decreasing Collateral

1. Withdraw NFTs
2. Remove liquidity from positions
3. Must maintain `currentSqrtK >= sqrtKFloor`

### Borrowing More

1. Calculate new total debt
2. Calculate new `sqrtKFloor`
3. Verify `currentSqrtK >= newSqrtKFloor`

## Edge Cases

### Price Near Position Boundaries

When price moves to position edges:

- Amount of one token approaches zero
- sqrt(K) decreases
- May trigger liquidation

### Impermanent Loss Effects

Concentrated liquidity has amplified IL:

- More sensitive to price movements
- sqrt(K) can decrease significantly
- Monitor positions actively

## Security Considerations

### Flash Loan Resistance

The sqrt(K) calculation:

- Uses spot values, not TWAPs
- But manipulation requires capital
- Economic security through capital requirements

### Oracle Independence

Unlike price oracles:

- No external data dependencies
- Calculated from on-chain state
- Resistant to oracle manipulation

## Related Concepts

- [L-Units](./l-units.md) - Liquidity unit accounting
- [Collateral Management](../patterns/collateral-management.md) - Managing collateral
- [Keeper Flows](../patterns/keeper-flows.md) - Liquidation process
