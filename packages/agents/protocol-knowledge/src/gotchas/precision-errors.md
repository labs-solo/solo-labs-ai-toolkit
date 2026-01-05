# Precision Errors: PIPS, WAD, and Rounding

## Overview

Precision errors are among the most common bugs in DeFi protocols. AEGIS uses multiple precision levels (PIPS, WAD, RAY) and careful rounding strategies to maintain correctness.

## Precision Levels

| Name | Value | Use Case |
|------|-------|----------|
| PIPS | 1e6 | Percentages, fees, ratios |
| WAD | 1e18 | Token amounts, L-units |
| RAY | 1e27 | Interest rate calculations |
| X96 | 2^96 | Uniswap sqrt prices |

## Common Errors

### 1. Wrong Denominator

**Wrong:**

```solidity
function applyFee(uint256 amount, uint256 feePips) internal returns (uint256) {
    // BUG: Using WAD instead of PIPS denominator
    return amount * feePips / 1e18;
}
```

**Correct:**

```solidity
function applyFee(uint256 amount, uint256 feePips) internal returns (uint256) {
    return amount * feePips / 1_000_000;  // PIPS_DENOMINATOR
}
```

### 2. Order of Operations

**Wrong:**

```solidity
function calculateShare(uint256 amount, uint256 total, uint256 shares) internal returns (uint256) {
    // BUG: Division before multiplication loses precision
    return amount / total * shares;
}
```

**Correct:**

```solidity
function calculateShare(uint256 amount, uint256 total, uint256 shares) internal returns (uint256) {
    // Multiply first, then divide
    return amount * shares / total;
}
```

**Best:**

```solidity
function calculateShare(uint256 amount, uint256 total, uint256 shares) internal returns (uint256) {
    // Use FullMath for overflow safety
    return FullMath.mulDiv(amount, shares, total);
}
```

### 3. Mixing Precision Levels

**Wrong:**

```solidity
function calculateInterest(uint256 principalWad, uint256 ratePips) internal returns (uint256) {
    // BUG: Result is in weird units (WAD * PIPS)
    return principalWad * ratePips;
}
```

**Correct:**

```solidity
function calculateInterest(uint256 principalWad, uint256 ratePips) internal returns (uint256) {
    // Normalize to WAD
    return FullMath.mulDiv(principalWad, ratePips, PIPS_DENOMINATOR);
}
```

### 4. Truncation to Zero

**Problem:**

```solidity
// Small amounts can truncate to zero
uint256 fee = 10 * 100 / 1_000_000;  // = 0, not 0.001
```

**Solutions:**

```solidity
// Solution 1: Minimum fee
uint256 fee = Math.max(amount * feePips / PIPS, MIN_FEE);

// Solution 2: Scale up intermediate
uint256 feeWad = amount * feePips * 1e12;  // Now in WAD precision
// ... process in WAD ...
uint256 fee = feeWad / 1e18;

// Solution 3: Round up
uint256 fee = (amount * feePips + PIPS - 1) / PIPS;
```

### 5. Sqrt Price Conversion Errors

**Wrong:**

```solidity
function getPrice(uint160 sqrtPriceX96) internal returns (uint256) {
    // BUG: Overflow risk and wrong scaling
    return uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (2**96);
}
```

**Correct:**

```solidity
function getPrice(uint160 sqrtPriceX96) internal returns (uint256) {
    // Use FullMath to avoid overflow
    return FullMath.mulDiv(
        uint256(sqrtPriceX96),
        uint256(sqrtPriceX96),
        1 << 192
    );
}
```

## Rounding Rules

### Protocol-Favorable Rounding

Always round in the protocol's favor to prevent value extraction:

| Operation | Round Direction | Rationale |
|-----------|-----------------|-----------|
| Fee calculation | Up | Protocol gets more |
| Withdrawal amount | Down | User gets less |
| Collateral requirement | Up | More collateral needed |
| Share minting | Down | Fewer shares issued |
| Share burning | Up | More shares burned |

### Implementation

```solidity
// Round down (default)
uint256 amountDown = a * b / c;

// Round up
uint256 amountUp = (a * b + c - 1) / c;

// Using FullMath
uint256 down = FullMath.mulDiv(a, b, c);
uint256 up = FullMath.mulDivUp(a, b, c);
```

### Deposit/Withdraw Example

```solidity
function deposit(uint256 amount) external returns (uint256 shares) {
    // Round DOWN shares minted (favor protocol)
    shares = FullMath.mulDiv(amount, totalShares, totalAssets);
    _mint(msg.sender, shares);
}

function withdraw(uint256 shares) external returns (uint256 amount) {
    // Round DOWN amount returned (favor protocol)
    amount = FullMath.mulDiv(shares, totalAssets, totalShares);
    _burn(msg.sender, shares);
    _transfer(msg.sender, amount);
}
```

## Dangerous Patterns

### 1. Accumulating Rounding Errors

```solidity
// Each iteration loses precision
for (uint256 i = 0; i < 100; i++) {
    balance = balance * rate / PIPS;  // Error accumulates!
}
```

**Fix: Use exponentiation or higher precision**

### 2. Price Oracle Precision Loss

```solidity
// Wrong: Loses precision in cross-rate
uint256 ethUsd = 2000e8;  // 8 decimals
uint256 btcUsd = 50000e8;
uint256 ethBtc = ethUsd / btcUsd;  // = 0!
```

**Fix:**

```solidity
uint256 ethBtc = FullMath.mulDiv(ethUsd, 1e18, btcUsd);
```

### 3. Integer Division Asymmetry

```solidity
// Positive and negative round differently
int256 a = 7 / 3;   // = 2 (rounds toward zero)
int256 b = -7 / 3;  // = -2 (rounds toward zero, not -3)
```

**Fix: Explicit rounding functions for signed math**

## Testing for Precision Errors

### Boundary Testing

```solidity
function test_minimalAmount() public {
    // Test with smallest meaningful amounts
    uint256 tiny = 1;  // 1 wei
    uint256 fee = engine.calculateFee(tiny, 100);  // 0.01%

    // Should be at least 1 or explicitly 0
    assertTrue(fee >= 1 || fee == 0);
}
```

### Fuzz Testing

```solidity
function testFuzz_noValueLeak(uint256 amount, uint256 rate) public {
    amount = bound(amount, 1, type(uint128).max);
    rate = bound(rate, 1, PIPS_DENOMINATOR);

    uint256 before = totalValue();
    executeOperation(amount, rate);
    uint256 after = totalValue();

    // No value created from thin air
    assertLe(after, before + 1);  // Allow 1 wei rounding
}
```

### Invariant Testing

```solidity
function invariant_noValueCreation() public {
    uint256 totalIn = sumDeposits + sumBorrows;
    uint256 totalOut = sumWithdrawals + sumRepays;

    // Out can be less (rounding in protocol favor)
    // Out should never exceed in
    assertLe(totalOut, totalIn);
}
```

## Debugging Checklist

1. **Check denominators**: Are you using PIPS (1e6) or WAD (1e18)?
2. **Check operation order**: Multiply before divide?
3. **Check for zero results**: Small inputs truncating?
4. **Check rounding direction**: Favors protocol?
5. **Check overflow risk**: Need FullMath?
6. **Check accumulation**: Error building up?

## Related Concepts

- [PIPS](../concepts/pips.md) - PIPS precision standard
- [L-Units](../concepts/l-units.md) - WAD precision for liquidity
- [Equity Neutrality](./equity-neutrality.md) - Rounding can violate
