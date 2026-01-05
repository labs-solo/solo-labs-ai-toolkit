# Equity Neutrality: Common Violations

## The Invariant

**Borrow and repay operations MUST NOT change `equityLWad`.**

This is the fundamental accounting invariant of AEGIS. When a user borrows or repays, only `debtPrincipalLWad` changes. The lenders' equity (`equityLWad`) remains constant.

## Why This Matters

### Correct Behavior

```
Before Borrow:
  equityLWad = 1000
  debtPrincipalLWad = 500

After Borrow of 100L:
  equityLWad = 1000       ← UNCHANGED
  debtPrincipalLWad = 600 ← +100

Before Repay:
  equityLWad = 1000
  debtPrincipalLWad = 600

After Repay of 50L:
  equityLWad = 1000       ← UNCHANGED
  debtPrincipalLWad = 550 ← -50
```

### What Equity Neutrality Protects

1. **Share price stability**: Borrows don't dilute lenders
2. **Fair accounting**: Debt doesn't become equity
3. **Predictable returns**: Lenders know their expected yield
4. **Protocol solvency**: Assets match liabilities

## Common Violations

### 1. Adding Borrow Amount to Equity

**Wrong:**

```solidity
function borrow(uint256 amount) internal {
    // BUG: This increases lender equity!
    equityLWad += amount;
    debtPrincipalLWad += amount;
}
```

**Correct:**

```solidity
function borrow(uint256 amount) internal {
    // Only debt changes
    debtPrincipalLWad += amount;
}
```

### 2. Subtracting Repay from Equity

**Wrong:**

```solidity
function repay(uint256 amount) internal {
    // BUG: This decreases lender equity!
    equityLWad -= amount;
    debtPrincipalLWad -= amount;
}
```

**Correct:**

```solidity
function repay(uint256 amount) internal {
    // Only debt changes
    debtPrincipalLWad -= amount;
}
```

### 3. Confusing Interest with Principal

**Wrong:**

```solidity
function accrueInterest() internal {
    uint256 interest = calculateInterest();
    // BUG: Interest should go to equity, not debt principal
    debtPrincipalLWad += interest;
}
```

**Correct:**

```solidity
function accrueInterest() internal {
    uint256 interest = calculateInterest();
    // Interest DOES increase equity (it's a fee, not a borrow)
    equityLWad += interest;
}
```

### 4. Double-Counting During Liquidation

**Wrong:**

```solidity
function liquidate(uint256 vaultId) internal {
    uint256 debt = vaults[vaultId].debtL;
    uint256 proceeds = sellCollateral(vaultId);

    // BUG: Proceeds shouldn't go to equity if covering debt
    equityLWad += proceeds;
    debtPrincipalLWad -= debt;
}
```

**Correct:**

```solidity
function liquidate(uint256 vaultId) internal {
    uint256 debt = vaults[vaultId].debtL;
    uint256 proceeds = sellCollateral(vaultId);

    if (proceeds >= debt) {
        // Debt fully covered
        debtPrincipalLWad -= debt;
        // Remainder to vault owner (not equity)
        transferToOwner(proceeds - debt);
    } else {
        // Bad debt - this DOES affect equity
        debtPrincipalLWad -= debt;
        equityLWad -= (debt - proceeds);  // Socialize loss
    }
}
```

### 5. Fee Calculation Errors

**Wrong:**

```solidity
function chargeBorrowFee(uint256 borrowAmount) internal {
    uint256 fee = borrowAmount * FEE_RATE / PIPS;

    // BUG: Fee should increase equity, but borrow shouldn't
    equityLWad += borrowAmount;  // Wrong!
    equityLWad += fee;           // Correct
}
```

**Correct:**

```solidity
function chargeBorrowFee(uint256 borrowAmount) internal {
    uint256 fee = borrowAmount * FEE_RATE / PIPS;

    // Only the fee increases equity
    equityLWad += fee;

    // Borrow increases debt only
    debtPrincipalLWad += borrowAmount;
}
```

## Validation Checks

### Invariant Test

```solidity
function test_equityNeutrality_borrow() public {
    uint256 equityBefore = engine.equityLWad();

    // Perform borrow
    vm.prank(borrower);
    engine.borrow(vaultId, 100e18);

    uint256 equityAfter = engine.equityLWad();

    // Equity unchanged (only fee might add to it)
    assertEq(equityAfter, equityBefore + expectedFee);
}

function test_equityNeutrality_repay() public {
    uint256 equityBefore = engine.equityLWad();

    // Perform repay
    vm.prank(borrower);
    engine.repay(vaultId, 50e18);

    uint256 equityAfter = engine.equityLWad();

    // Equity unchanged
    assertEq(equityAfter, equityBefore);
}
```

### Fuzz Test

```solidity
function testFuzz_equityNeutrality(
    uint256 borrowAmount,
    uint256 repayAmount
) public {
    borrowAmount = bound(borrowAmount, 1e18, 1000e18);
    repayAmount = bound(repayAmount, 0, borrowAmount);

    uint256 equityBefore = engine.equityLWad();

    engine.borrow(vaultId, borrowAmount);
    engine.repay(vaultId, repayAmount);

    uint256 equityAfter = engine.equityLWad();

    // Only fees should change equity
    uint256 expectedFeeIncrease = calculateExpectedFees(borrowAmount);
    assertEq(equityAfter, equityBefore + expectedFeeIncrease);
}
```

### Invariant Test

```solidity
function invariant_equityNeutralityHolds() public {
    // Track equity changes over all operations
    uint256 currentEquity = engine.equityLWad();
    uint256 totalFees = engine.accumulatedFees();

    // Equity should only increase by fees
    assertEq(currentEquity, initialEquity + totalFees);
}
```

## Debugging Violations

### Symptoms

1. **Share price drops unexpectedly**: Equity decreased
2. **Share price spikes on borrow**: Equity incorrectly increased
3. **Lenders lose money on normal operations**: Equity leaking
4. **Protocol becomes insolvent**: Assets < liabilities

### Debugging Steps

1. **Track equity before/after each operation**
2. **Verify only fees increase equity**
3. **Check debt changes equal borrow/repay amounts**
4. **Audit liquidation paths separately**

### Logging Pattern

```solidity
function borrow(uint256 amount) internal {
    uint256 equityBefore = equityLWad;
    uint256 debtBefore = debtPrincipalLWad;

    _executeBorrow(amount);

    // Verify invariant
    assert(equityLWad == equityBefore + expectedFee);
    assert(debtPrincipalLWad == debtBefore + amount);

    emit BorrowExecuted(amount, equityLWad, debtPrincipalLWad);
}
```

## Safe Operations Reference

| Operation | equityLWad Change | debtPrincipalLWad Change |
|-----------|-------------------|--------------------------|
| Deposit | +depositL | 0 |
| Withdraw | -withdrawL | 0 |
| Borrow | +fee only | +borrowL |
| Repay | 0 | -repayL |
| Interest accrual | +interest | 0 |
| Swap fee | +fee | 0 |
| Bad debt | -badDebt | -badDebt |

## Related Concepts

- [L-Units](../concepts/l-units.md) - Accounting foundation
- [Fee Accrual](../patterns/fee-accrual.md) - Legitimate equity increases
- [Precision Errors](./precision-errors.md) - Rounding can violate neutrality
