# L-Units: Liquidity Accounting in AEGIS

## Overview

L-units are Uniswap liquidity units used throughout AEGIS for equity-neutral accounting. They provide a **price-agnostic, oracle-free** unit of account that doesn't change when borrows or repays occur. The lender book is maintained entirely in L-units.

> **Reference:** Research-0009 "L-Unit Ledger for Canonical Full-Range Liquidity"

## Key Properties

### Definition

- L-units represent ownership of Uniswap V4 **full-range** liquidity (MIN_TICK → MAX_TICK)
- Stored as `uint256` (per-NFT mints/burns saturate to `uint128`)
- Directly correspond to Uniswap's internal liquidity units

### Core Variables

| Variable | Description | Precision |
|----------|-------------|-----------|
| `L` | Liquidity of canonical full-range NFT | uint256 |
| `B_L` | Borrower principal aggregated in L-units | uint256 |
| `M` | Interest multiplier (simple interest) | WAD (1e18) |
| `T` | Lender share supply (ERC-20) | WAD (1e18) |
| `E_L` | Booked equity: `L + B_L * M` | L-units |

### Share Price Formula

```
sharePrice = E_L / T = (L + B_L * M) / T
```

The share price represents how many L-units each share is worth. At bootstrap (T=0), initial price is **1 L per share**.

## L-Unit Flows

### Fee Sync (feeSync)

Called at the **top** of every public mutator:

1. `collect()` swap fees from pool → `(Δx, Δy)`
2. Mint as much L as tokens allow: `mintFullRange(Δx, Δy)`
3. Residuals `(R0, R1)` carried forward **off-equity** until mintable
4. `L += ΔL_fees` (equity increases from fees)

**Only mintable fees count** — residual tokens don't affect equity until converted to L.

### Deposits

1. User requests **target ΔL** (not token amounts)
2. Quote required tokens: `getAmountsForLiquidity(s, MIN, MAX, ΔL)`
3. Pull exact tokens, mint full-range liquidity
4. Mint shares proportionally:

```
ΔT = (T == 0) ? ΔL : floor(ΔL * T / E_L)
```

### Withdrawals

1. User burns ΔT shares
2. Calculate claim in L-units: `E_claim = (ΔT / T) * (L + B_L * M)`
3. Enforce utilization cap: `E_claim ≤ L - L_min` where `L_min = B_L*M * (1/Ū - 1)`
4. Burn liquidity, transfer tokens to user

```
withdrawL = ΔT * E_L / T
```

### Borrows

1. Burn real L from pool: `L_real = r_L * M`
2. Credit tokens to vault
3. Update global: `L -= L_real`, `B_L += r_L`
4. **Conservative √K bridge**: `vault.b_K += r_L` (1 L ≡ 1 √K for debt)
5. **E_L unchanged** (equity neutrality)

### Repays

1. Mint real L to pool from repaid tokens
2. Record actual liquidity minted and tokens used
3. Effective principal: `r_L_eff = floor(liquidityMinted / M)`
4. Update global: `L += liquidityMinted`, `B_L -= r_L_eff`
5. **Conservative √K decrease**: `Δb_K = min(r_L_eff, floor(sqrt(x_used * y_used)) / M)`
6. **E_L unchanged** (equity neutrality)

## Why L-Units?

### Problem: Token Amounts Fluctuate

When using raw token amounts, the "value" of debt changes as pool price moves:

- Token 0 worth more → debt seems higher
- Token 1 worth more → debt seems lower

### Solution: L-Units Are Price-Neutral

L-units measure liquidity position, not token amounts:

- Same L-units = same share of pool
- Price changes don't affect L-unit values
- Enables equity-neutral borrow/repay

## Mathematical Foundations

### Converting Amounts to L-Units

```solidity
// From token amounts to L-units
L = LMath.getLFromAmounts(amount0, amount1, sqrtPriceX96, tickLower, tickUpper)
```

### Converting L-Units to Amounts

```solidity
// From L-units to token amounts
(amount0, amount1) = LMath.getAmountsFromL(L, sqrtPriceX96, tickLower, tickUpper)
```

### Key Relationship

```
L = liquidity * (tickSpacing factor)
```

Where liquidity is Uniswap's internal unit for concentrated positions.

## Common Operations

### Calculate Required L-Units for Borrow

```solidity
borrowL = LMath.getLFromAmounts(borrowAmount0, borrowAmount1, currentSqrtPrice, ...)
```

### Calculate Tokens for Withdrawal

```solidity
(amount0, amount1) = LMath.getAmountsFromL(
    shares * equityLWad / totalShares,
    currentSqrtPrice,
    tickLower,
    tickUpper
)
```

## Invariants

| ID | Statement | Reason |
|----|-----------|--------|
| I-1 | **Equity-neutral borrow/repay**: E_L unchanged by borrow/repay | Burn/mint r_L×M from L and move principal; algebra cancels |
| I-2 | **Utilization cap**: All user actions enforce U_L ≤ Ū (95%) | Enforced on withdrawals; borrow/repay maintain by construction |
| I-3 | **Protocol rake on interest only**; swap fees accrue to holders | feeSync() and interest accrual separation |
| I-4 | **Per-vault solvency**: Non-overstatement of √K collateral | Delegated to Research-0008 |
| I-5 | **No deposit donations**: Deposits don't create equity outside ΔL | Target-ΔL with exact pulls and refunds |
| I-6 | **Share price monotone ↑**: On both deposits and withdrawals | Proportional mint (floor-rounded) |

## Interest Accrual

```solidity
// Per-tick accrual (simple interest)
ΔM = rate(U_L) * Δt
M += ΔM
ΔE = B_L * ΔM  // Interest earned in L-units

// Protocol fee mint (only on interest, never swap fees)
fee = f_prot * ΔE  // e.g., 10% of interest
mint = floor(fee * T / (E_L + ΔE - fee))
```

## Related Concepts

- [PIPS](./pips.md) - Precision for percentages
- [sqrt(K) Floor](./sqrt-k-floor.md) - Per-vault collateral (Research-0008)
- [Vault Operations](../patterns/vault-operations.md) - How vaults use L-units
- [Equity Neutrality](../gotchas/equity-neutrality.md) - Common violations
