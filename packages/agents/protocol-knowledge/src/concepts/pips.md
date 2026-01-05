# PIPS: Parts Per Million in AEGIS

## Overview

PIPS (Parts Per Million) is the precision standard used throughout AEGIS for representing percentages, ratios, and fees. Using 1e6 as the denominator provides sufficient precision while avoiding overflow issues.

## Definition

```
1 PIP = 1 / 1,000,000 = 0.0001%
100% = 1,000,000 PIPS
```

### Common Values

| Percentage | PIPS Value | Constant |
|------------|------------|----------|
| 100% | 1,000,000 | `1e6` |
| 95% | 950,000 | Utilization cap |
| 50% | 500,000 | |
| 10% | 100,000 | |
| 1% | 10,000 | |
| 0.1% | 1,000 | |
| 0.01% | 100 | |
| 0.001% | 10 | |
| 0.0001% | 1 | 1 PIP |

## Why PIPS?

### Problem: Percentage Precision

With simple percentages:

- 5% = 5 (loses sub-percent precision)
- 5.5% = ? (can't represent)

### Solution: PIPS Scale

With PIPS:

- 5% = 50,000 PIPS
- 5.5% = 55,000 PIPS
- 5.55% = 55,500 PIPS
- 5.555% = 55,550 PIPS

### Why Not WAD (1e18)?

- WAD is overkill for percentages
- Higher overflow risk in multiplications
- PIPS sufficient for financial precision
- Gas efficiency

## AEGIS Constants

AEGIS uses **BPS (basis points)** for most parameters, where 10,000 BPS = 100%.

### Protocol Parameters (BPS)

```solidity
// From Constants.sol
uint256 constant BPS_DENOMINATOR = 10_000;

// LTV Thresholds
uint256 constant MAX_LTV_BPS = 9_800;           // 98% - Max allowed LTV
uint256 constant HARD_LTV_BPS = 9_900;          // 99% - Hard liquidation threshold

// Utilization
uint256 constant UTILIZATION_CAP_BPS = 9_500;   // 95% - Market utilization cap

// Fees (bounded to 10_000 max)
uint256 constant PROTOCOL_FEE_MAX_BPS = 10_000; // Max protocol fee on interest

// Keeper Rewards
uint256 constant PEEL_BOUNTY_BPS = varies;      // Keeper peel reward
uint256 constant MICRO_LIQ_FEE_MAX_BPS = varies; // Max micro-liquidation fee
```

### PPM (Parts Per Million) for Hook Fees

```solidity
// From PoolPolicyManager.sol
uint256 constant PPM_SCALE = 1_000_000;         // 1e6 for hook fees

// Hook fees use PPM, bounded by PPM_SCALE
hookFeePpm <= PPM_SCALE  // Max 100%
```

## Mathematical Operations

### Applying a PIPS Rate

```solidity
// Calculate amount * rate (in PIPS)
function applyPips(uint256 amount, uint256 ratePips) internal pure returns (uint256) {
    return amount * ratePips / PIPS_DENOMINATOR;
}

// Example: 1000 tokens at 5% fee
// fee = 1000 * 50_000 / 1_000_000 = 50 tokens
```

### Converting to/from PIPS

```solidity
// Percentage to PIPS
function toPips(uint256 percent) internal pure returns (uint256) {
    return percent * 10_000;  // 5% → 50,000 PIPS
}

// PIPS to percentage (with decimals)
function fromPips(uint256 pips) internal pure returns (uint256) {
    return pips / 10_000;  // 50,000 PIPS → 5%
}
```

### Safe Multiplication

```solidity
// Avoid overflow: multiply then divide
function mulPips(uint256 a, uint256 pips) internal pure returns (uint256) {
    return (a * pips) / PIPS_DENOMINATOR;
}

// For large numbers, use mulDiv
function safeMulPips(uint256 a, uint256 pips) internal pure returns (uint256) {
    return FullMath.mulDiv(a, pips, PIPS_DENOMINATOR);
}
```

## Precision Considerations

### Rounding

Always consider rounding direction:

```solidity
// Round down (default, favors protocol)
uint256 fee = amount * feePips / PIPS_DENOMINATOR;

// Round up (when needed)
uint256 feeUp = (amount * feePips + PIPS_DENOMINATOR - 1) / PIPS_DENOMINATOR;

// Using FullMath
uint256 feeDown = FullMath.mulDiv(amount, feePips, PIPS_DENOMINATOR);
uint256 feeUp = FullMath.mulDivUp(amount, feePips, PIPS_DENOMINATOR);
```

### Precision Loss

With small amounts:

```solidity
// 10 tokens at 0.01% fee
// fee = 10 * 100 / 1_000_000 = 0 (precision loss!)

// Solution: use minimum or WAD intermediate
uint256 feeWad = amount * feePips * 1e12;  // Scale up
// ... process in WAD ...
uint256 fee = feeWad / 1e18;  // Scale down
```

## PIPS vs WAD Comparison

| Aspect | PIPS (1e6) | WAD (1e18) |
|--------|------------|------------|
| Precision | 0.0001% | ~0 |
| Overflow risk | Lower | Higher |
| Gas cost | Lower | Higher |
| Use case | Percentages | Amounts |
| Typical domain | Fees, ratios | Token amounts |

## Common Patterns

### Fee Calculation

```solidity
function calculateFee(uint256 amount, uint256 feePips) internal pure returns (uint256) {
    return FullMath.mulDiv(amount, feePips, PIPS_DENOMINATOR);
}
```

### Utilization Check

```solidity
function isUtilizationSafe(uint256 borrowed, uint256 total) internal pure returns (bool) {
    uint256 utilizationPips = FullMath.mulDiv(borrowed, PIPS_DENOMINATOR, total);
    return utilizationPips <= MAX_UTILIZATION_PIPS;
}
```

### Collateral Ratio Check

```solidity
function isCollateralSufficient(
    uint256 collateralValue,
    uint256 debtValue,
    uint256 minRatioPips
) internal pure returns (bool) {
    // collateralValue / debtValue >= minRatioPips / PIPS_DENOMINATOR
    return collateralValue * PIPS_DENOMINATOR >= debtValue * minRatioPips;
}
```

## Debugging Tips

1. **Check scale**: Ensure both operands use PIPS
2. **Watch for truncation**: Small amounts lose precision
3. **Verify denominator**: Always divide by 1e6
4. **Test boundaries**: Check at 0%, 100%, edge values

## Related Concepts

- [L-Units](./l-units.md) - Uses WAD precision
- [Precision Errors](../gotchas/precision-errors.md) - Common mistakes
- [Fee Accrual](../patterns/fee-accrual.md) - Fee calculations
