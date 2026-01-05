---
name: debug-collateral
description: Debug sqrt(K) floor calculations, solvency checks, and collateral requirements
argument-hint: <scenario> [--vault <id>] [--simulate <params>] [--trace]
allowed-tools: Read(*), Grep(*), Glob(*), Task(subagent_type:l-unit-accountant), Task(subagent_type:context-loader)
---

# /debug-collateral Command

Debug AEGIS protocol collateral calculations including sqrt(K) floor derivation, LTV threshold checks, and multi-NFT solvency validation.

## Usage

```bash
/debug-collateral <scenario> [--vault <id>] [--simulate <params>] [--trace]
```

## Arguments

- `<scenario>`: Scenario to debug
  - `floor-calc` - Debug sqrt(K) floor calculation
  - `ltv-check` - Debug LTV threshold validation
  - `liquidation-threshold` - Debug liquidation trigger conditions
  - `nft-valuation` - Debug multi-NFT collateral valuation
  - `all` - Run all collateral debugging scenarios
- `--vault <id>`: Analyze specific vault's collateral state
- `--simulate <params>`: Simulate collateral changes (format: `"debt=100,collateral=150"`)
- `--trace`: Show step-by-step calculation trace

## Examples

```bash
/debug-collateral floor-calc --trace
/debug-collateral ltv-check --vault 0x123
/debug-collateral liquidation-threshold
/debug-collateral all --simulate "debt=100,collateral=150"
/debug-collateral nft-valuation --vault 0x456 --trace
```

## Task

Debug AEGIS collateral mechanics by:

1. **Load collateral math** from `CollateralFloorMath.sol`
2. **Identify calculations** for the specified scenario
3. **Trace sqrt(K) floor** derivation step-by-step
4. **Validate against LTV thresholds** (MAX_LTV_BPS=9800, HARD_LTV_BPS=9900)
5. **Check multi-NFT SAFE algorithm** if applicable

## Core Concepts

### sqrt(K) Floor

The collateral floor is derived from the Uniswap V4 pool's constant product:

```text
K = reserve0 * reserve1
floor = √K

Conservative Bridge: 1 L ≡ 1 √K for debt accounting
```

This provides an **oracle-free, static collateral bound** that doesn't depend on external price feeds.

### LTV Thresholds (BPS)

```solidity
uint32 constant MAX_LTV_BPS = 9_800;   // 98% - Maximum allowed LTV
uint32 constant HARD_LTV_BPS = 9_900;  // 99% - Liquidation threshold
uint256 constant UTILIZATION_CAP_BPS = 9_500; // 95% - Market utilization cap
```

### Collateral Calculation

```text
LTV = (Debt_L / Collateral_L) * BPS_DENOMINATOR

Where:
- Debt_L = debtPrincipalL + accruedInterest
- Collateral_L = sum of attached NFT liquidity values
```

## Workflow

### Step 1: Load Collateral Context

1. Read `CollateralFloorMath.sol` and related libraries
2. If --vault specified, load vault state
3. Identify the calculation path for the scenario

### Step 2: Trace Calculations

For each scenario:

- **floor-calc**: Trace from pool reserves to sqrt(K) floor
- **ltv-check**: Trace from vault state to LTV computation
- **liquidation-threshold**: Trace from LTV to liquidation eligibility
- **nft-valuation**: Trace multi-NFT contribution to collateral

### Step 3: Validate Against Thresholds

Compare calculated values against:

- MAX_LTV_BPS (9800) for borrow limits
- HARD_LTV_BPS (9900) for liquidation trigger
- UTILIZATION_CAP_BPS (9500) for market limits

### Step 4: Report Findings

Generate detailed report with calculations, status, and recommendations.

## Delegation

Invoke **l-unit-accountant** with:

- `scenario`: parsed scenario type
- `vault_id`: from --vault argument (if provided)
- `simulate_params`: from --simulate argument (if provided)
- `trace`: from --trace flag

For complex analysis, first invoke **context-loader** to gather collateral-related code.

## Output Format

```yaml
scenario: [analyzed scenario]
vault_id: [if specified]

sqrt_k_floor:
  formula: "floor = √(reserve0 * reserve1)"
  conservative_bridge: "1 L ≡ 1 √K for debt accounting"

  pool_state:
    reserve0: [value in token0 units]
    reserve1: [value in token1 units]
    k_value: [reserve0 * reserve1]
    sqrt_k: [calculated floor]

  calculation_trace:  # if --trace specified
    - step: 1
      operation: "Load pool reserves"
      inputs:
        reserve0: "1000000000000000000"
        reserve1: "2000000000000000000"
      output: "Reserves loaded"

    - step: 2
      operation: "Calculate K = r0 * r1"
      inputs:
        reserve0: "1e18"
        reserve1: "2e18"
      output: "K = 2e36"
      formula: "K = 1e18 * 2e18 = 2e36"

    - step: 3
      operation: "Calculate sqrt(K)"
      inputs:
        k: "2e36"
      output: "sqrt(K) = 1.414e18"
      formula: "√(2e36) ≈ 1.414e18"

ltv_analysis:
  current_ltv_bps: 8500
  max_ltv_bps: 9800
  hard_ltv_bps: 9900
  status: healthy  # healthy | warning | liquidatable
  headroom_bps: 1300  # remaining before max_ltv

  thresholds:
    - name: "MAX_LTV"
      value_bps: 9800
      current_distance_bps: 1300
      status: "Safe - 13% headroom"

    - name: "HARD_LTV (Liquidation)"
      value_bps: 9900
      current_distance_bps: 1400
      status: "Safe - 14% from liquidation"

collateral_breakdown:
  total_collateral_l: "1000000000000000000"  # 1e18 L-units
  total_debt_l: "850000000000000000"         # 0.85e18 L-units
  equity_l: "150000000000000000"             # 0.15e18 L-units
  utilization_bps: 8500

  debt_composition:
    principal_l: "800000000000000000"
    accrued_interest_l: "50000000000000000"

  nft_positions:  # if multi-NFT vault
    - nft_id: "12345"
      liquidity_l: "600000000000000000"
      tick_lower: -887220
      tick_upper: 887220
      contribution_to_floor: "60%"
      in_range: true

    - nft_id: "12346"
      liquidity_l: "400000000000000000"
      tick_lower: -100
      tick_upper: 100
      contribution_to_floor: "40%"
      in_range: true

solvency_check:
  is_solvent: true
  floor_respected: true

  checks:
    - name: "Collateral >= Debt"
      status: passed
      collateral: "1e18 L"
      debt: "0.85e18 L"

    - name: "LTV <= MAX_LTV"
      status: passed
      ltv: "8500 BPS"
      max: "9800 BPS"

    - name: "Utilization <= Cap"
      status: passed
      utilization: "8500 BPS"
      cap: "9500 BPS"

  violations: []  # Empty if solvent
  # If not solvent:
  # violations:
  #   - type: "ltv-exceeded"
  #     details: "LTV 9850 > MAX_LTV 9800"
  #   - type: "under-collateralized"
  #     details: "Debt 1.1e18 > Collateral 1.0e18"

simulation_results:  # if --simulate specified
  input_params:
    debt_change: "+100 L"
    collateral_change: "+150 L"

  before:
    collateral_l: "1000000000000000000"
    debt_l: "850000000000000000"
    ltv_bps: 8500
    status: "healthy"

  after:
    collateral_l: "1150000000000000000"
    debt_l: "950000000000000000"
    ltv_bps: 8261  # (950/1150) * 10000
    status: "healthy"

  outcome: safe  # safe | warning | would_liquidate
  analysis: "Adding 150L collateral with 100L debt improves LTV from 85% to 82.6%"

recommendations:
  - priority: high
    area: "LTV Management"
    suggestion: "Add collateral before LTV reaches 95%"
    rationale: "Provides buffer against price volatility"

  - priority: medium
    area: "NFT Diversification"
    suggestion: "Consider wider tick range for NFT positions"
    rationale: "Reduces concentration risk from tight ranges"
```

## Scenario Details

### floor-calc

Traces the sqrt(K) floor calculation from pool reserves:

1. Load pool state from Uniswap V4 PoolManager
2. Extract reserve0 and reserve1
3. Calculate K = reserve0 * reserve1
4. Calculate floor = sqrt(K)
5. Apply conservative bridge (1 L = 1 sqrt(K))

### ltv-check

Validates LTV against thresholds:

1. Load vault debt (principal + accrued interest)
2. Load vault collateral (sum of NFT liquidity)
3. Calculate LTV = (debt / collateral) * BPS_DENOMINATOR
4. Compare against MAX_LTV_BPS and HARD_LTV_BPS

### liquidation-threshold

Determines if vault is liquidatable:

1. Calculate current LTV
2. Check if LTV >= HARD_LTV_BPS (9900)
3. Check if vault is in liquidation-eligible state
4. Report liquidation parameters (incentives, amounts)

### nft-valuation

Values multi-NFT collateral using SAFE algorithm:

1. Enumerate attached NFTs (up to MAX_NFTS_PER_VAULT = 4)
2. For each NFT, compute liquidity contribution
3. Apply tick-range adjustments
4. Sum total collateral value

## Key Files Analyzed

| File | Purpose |
|------|---------|
| `contracts/libraries/ae/collateral/CollateralFloorMath.sol` | sqrt(K) floor calculations |
| `contracts/libraries/ae/collateral/TickSetCodec.sol` | Multi-NFT tick set encoding |
| `contracts/libraries/ae/vault/VaultLib.sol` | Vault state and collateral |
| `contracts/libraries/ae/math/LMath.sol` | L-unit math utilities |
| `contracts/libraries/ae/Constants.sol` | LTV thresholds and limits |

## Common Issues

### Precision Loss

```text
ISSUE: Precision loss in sqrt calculation
Location: CollateralFloorMath.sol:45
Impact: Floor could be slightly higher than actual
Fix: Use higher precision intermediate values
```

### Tick Range Edge Cases

```text
ISSUE: NFT with tick range outside current price
Location: TickSetCodec.sol:78
Impact: Liquidity contribution may be zero
Fix: Handle out-of-range NFTs explicitly
```

### Rounding Direction

```text
ISSUE: Rounding favors borrower over protocol
Location: LMath.sol:123
Impact: Small value leakage over time
Fix: Use mulDivUp for debt calculations
```

## Best Practices

1. **Use --trace** for debugging calculation issues
2. **Monitor LTV** approaching 95% as warning threshold
3. **Diversify NFT positions** across tick ranges
4. **Test edge cases** with --simulate before actual operations
5. **Review multi-NFT** contributions for concentration risk
