---
name: review-keeper-flow
description: Analyze peel and micro-liquidation implementations for correctness and incentives
argument-hint: <flow> [--vault <id>] [--simulate] [--profitability]
allowed-tools: Read(*), Grep(*), Glob(*), Task(subagent_type:aegis-architect), Task(subagent_type:context-loader)
---

# /review-keeper-flow Command

Analyze AEGIS protocol keeper mechanics including peel operations, micro-liquidations, and keeper incentive structures.

## Usage

```bash
/review-keeper-flow <flow> [--vault <id>] [--simulate] [--profitability]
```

## Arguments

- `<flow>`: Flow to review
  - `peel` - Analyze peel operation (partial debt reduction)
  - `micro-liq` - Analyze micro-liquidation mechanics
  - `full-liq` - Analyze full liquidation process
  - `incentives` - Analyze keeper reward structures
  - `all` - Review all keeper flows
- `--vault <id>`: Analyze keeper actions for specific vault
- `--simulate`: Simulate keeper execution with current state
- `--profitability`: Analyze keeper profit margins and gas costs

## Examples

```bash
/review-keeper-flow peel --simulate
/review-keeper-flow micro-liq --vault 0x123
/review-keeper-flow incentives --profitability
/review-keeper-flow all
/review-keeper-flow full-liq --vault 0x456 --simulate --profitability
```

## Task

Review AEGIS keeper mechanics by:

1. **Load keeper logic** from `keeper/` library
2. **Trace flow** from trigger condition to execution
3. **Analyze incentive calculations** and reward distribution
4. **Check vault locking requirements** and access control
5. **Validate against spec** (0410-Keepers-Peel-and-MicroLiq.md)

## Keeper Operations Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    AEGIS Keeper Operations                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │    PEEL     │    │  MICRO-LIQ  │    │       FULL-LIQ          │ │
│  ├─────────────┤    ├─────────────┤    ├─────────────────────────┤ │
│  │ Partial     │    │ Small       │    │ Complete liquidation    │ │
│  │ debt        │    │ position    │    │ of underwater vault     │ │
│  │ reduction   │    │ liquidation │    │                         │ │
│  │             │    │             │    │                         │ │
│  │ Trigger:    │    │ Trigger:    │    │ Trigger:                │ │
│  │ Excess debt │    │ LTV > 99%   │    │ LTV > 99% + large debt  │ │
│  │             │    │ Small debt  │    │                         │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│                                                                     │
│  Vault Lock Requirement: LOCKED (Keepers require vault locked)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Invariants

From spec `0410-Keepers-Peel-and-MicroLiq.md`:

1. **Vault must be locked** for keeper operations
2. **LTV >= HARD_LTV_BPS (9900)** for liquidation eligibility
3. **Keeper receives incentive** proportional to work done
4. **Protocol captures residual** after keeper reward
5. **Permissionless execution** - anyone can be a keeper

## Workflow

### Step 1: Load Keeper Context

1. Read `KeeperLib.sol` and related libraries
2. Load spec document `0410-Keepers-Peel-and-MicroLiq.md`
3. If --vault specified, load vault state

### Step 2: Trace Execution Flow

For each flow type:

- **peel**: Trace partial debt reduction mechanics
- **micro-liq**: Trace small position liquidation
- **full-liq**: Trace complete vault liquidation
- **incentives**: Analyze reward calculations

### Step 3: Validate Against Spec

Compare implementation against specification:

- Check trigger conditions match spec
- Verify incentive calculations
- Validate access control requirements

### Step 4: Analyze Profitability (if --profitability)

Calculate keeper economics:

- Estimate gas costs
- Calculate minimum profitable amount
- Determine expected profit margins

## Delegation

Invoke **aegis-architect** with:

- `task`: review-keeper-flow
- `flow`: parsed flow type
- `vault_id`: from --vault argument (if provided)
- `simulate`: from --simulate flag
- `profitability`: from --profitability flag

For deep analysis, first invoke **context-loader** to gather keeper-related code.

## Output Format

```yaml
flow: [analyzed flow]
vault_id: [if specified]

trigger_conditions:
  - condition: 'LTV >= HARD_LTV_BPS'
    threshold: 9900 # 99%
    description: 'Vault must be at or above hard LTV threshold'
    current_state: 9950 # if vault specified
    triggered: true

  - condition: 'Vault is locked'
    threshold: 'locked == true'
    description: 'Keepers require vault to be locked'
    current_state: true
    triggered: true

  - condition: 'Debt > MIN_LIQUIDATION_AMOUNT'
    threshold: '1000 L-units'
    description: 'Minimum debt for liquidation viability'
    current_state: 5000
    triggered: true

execution_flow:
  - step: 1
    function: '_checkLiquidationEligible()'
    file: 'contracts/libraries/ae/keeper/KeeperLib.sol'
    line: 45
    action: 'Verify vault meets liquidation criteria'
    requires_vault_locked: true
    state_change: 'None - view only'

  - step: 2
    function: '_calculateLiquidationAmount()'
    file: 'contracts/libraries/ae/keeper/KeeperLib.sol'
    line: 78
    action: 'Compute amount to liquidate'
    requires_vault_locked: true
    state_change: 'None - computation only'

  - step: 3
    function: '_executeLiquidation()'
    file: 'contracts/libraries/ae/keeper/KeeperLib.sol'
    line: 112
    action: 'Transfer collateral, reduce debt'
    requires_vault_locked: true
    state_change: 'Debt reduced, collateral seized'

  - step: 4
    function: '_distributeRewards()'
    file: 'contracts/libraries/ae/keeper/KeeperLib.sol'
    line: 156
    action: 'Pay keeper incentive, capture protocol fee'
    requires_vault_locked: true
    state_change: 'Keeper balance increased, protocol fee recorded'

incentive_analysis:
  keeper_reward_bps: 500 # 5% of liquidated amount
  protocol_fee_bps: 200 # 2% to protocol
  borrower_penalty_bps: 700 # Total penalty (keeper + protocol)
  reward_source: 'Seized collateral'

  calculation:
    liquidation_amount_l: '1000'
    gross_collateral_seized_l: '1070' # 107% of debt (penalty)
    keeper_reward_l: '50' # 5% of 1000
    protocol_fee_l: '20' # 2% of 1000
    returned_to_vault_l: '0' # Remaining collateral

  profitability: # if --profitability specified
    gas_estimate_wei: '250000'
    gas_price_gwei: '30'
    gas_cost_eth: '0.0075'
    gas_cost_usd: '15.00' # at $2000/ETH
    min_profitable_amount_l: '300' # Assuming 5% reward
    current_opportunity_l: '1000'
    expected_profit_l: '50'
    expected_profit_usd: '25.00' # Assuming $0.50/L
    profit_margin: '166%' # (profit - gas) / gas

vault_requirements:
  must_be_locked: true
  lock_mechanism: 'Session-based vault lock'
  who_can_lock: 'Vault owner or protocol'
  lock_duration: 'Until explicitly unlocked'
  who_can_trigger: 'Anyone (permissionless)'

  access_control:
    - check: 'require(vault.isLocked)'
      location: 'KeeperLib.sol:48'
      purpose: 'Prevent user interference during liquidation'

    - check: 'require(msg.sender != vault.owner) || isKeeper'
      location: 'KeeperLib.sol:52'
      purpose: 'Prevent self-liquidation gaming'

spec_compliance:
  spec_ref: '0410-Keepers-Peel-and-MicroLiq.md'

  compliance_checks:
    - section: 'Trigger Conditions'
      expected: 'LTV >= 99% for liquidation eligibility'
      actual: 'LTV >= HARD_LTV_BPS (9900)'
      status: compliant

    - section: 'Keeper Rewards'
      expected: '5% of liquidated amount'
      actual: 'KEEPER_REWARD_BPS (500)'
      status: compliant

    - section: 'Vault Lock Requirement'
      expected: 'Vault must be locked for keeper ops'
      actual: 'require(vault.isLocked) in all keeper functions'
      status: compliant

  deviations:
    - section: 'Micro-liquidation threshold'
      expected: '< 1000 L-units'
      actual: '< 500 L-units'
      severity: info
      reason: 'Adjusted for gas efficiency'

edge_cases:
  - scenario: 'Vault exactly at 99% LTV'
    handling: 'Liquidation allowed (>= not >)'
    potential_issue: 'None - spec compliant'

  - scenario: 'Multiple keepers race condition'
    handling: 'First successful tx wins'
    potential_issue: 'MEV extraction possible'
    mitigation: 'Consider flashbots or private mempool'

  - scenario: 'Dust amounts after liquidation'
    handling: 'Remaining dust stays in vault'
    potential_issue: 'Gas inefficiency for small remainders'
    mitigation: 'Minimum liquidation amount threshold'

  - scenario: 'Collateral price drops during execution'
    handling: 'Uses cached price from session start'
    potential_issue: 'Stale price could under-liquidate'
    mitigation: 'Session duration limits exposure'

recommendations:
  - priority: high
    area: 'MEV Protection'
    suggestion: 'Consider commit-reveal or flashbots integration'
    rationale: 'Prevent keeper front-running and sandwich attacks'

  - priority: medium
    area: 'Gas Optimization'
    suggestion: 'Batch multiple small liquidations'
    rationale: 'Amortize fixed gas costs across operations'

  - priority: low
    area: 'Monitoring'
    suggestion: 'Add events for liquidation metrics'
    rationale: 'Enable off-chain keeper efficiency analysis'

simulation_results: # if --simulate specified
  vault_state_before:
    collateral_l: '1000'
    debt_l: '995'
    ltv_bps: 9950
    status: 'liquidatable'

  execution_preview:
    liquidation_type: 'micro-liq'
    amount_to_liquidate_l: '995'
    collateral_to_seize_l: '1065'
    keeper_reward_l: '50'
    protocol_fee_l: '20'

  vault_state_after:
    collateral_l: '0'
    debt_l: '0'
    ltv_bps: 0
    status: 'empty'

  keeper_profit:
    gross_reward_l: '50'
    gas_cost_l: '15'
    net_profit_l: '35'
```

## Flow Details

### Peel Operation

Partial debt reduction without full liquidation:

1. Check vault has excess debt (LTV > target)
2. Calculate peel amount to bring LTV to target
3. Seize proportional collateral
4. Distribute keeper reward
5. Update vault state

### Micro-Liquidation

Small position liquidation for gas efficiency:

1. Check vault debt < micro-liq threshold
2. Liquidate entire position
3. Simplified reward calculation
4. Lower gas overhead than full-liq

### Full Liquidation

Complete vault liquidation:

1. Check LTV >= HARD_LTV_BPS
2. Liquidate all debt
3. Seize all collateral (up to debt + penalty)
4. Return excess to vault owner
5. Close vault position

### Incentive Structure

```text
Liquidation Value = Debt_L * (1 + PENALTY_BPS / 10000)

Distribution:
├── Keeper Reward: Debt_L * KEEPER_REWARD_BPS / 10000
├── Protocol Fee:  Debt_L * PROTOCOL_FEE_BPS / 10000
└── Borrower Loss: Total penalty (keeper + protocol)
```

## Key Files Analyzed

| File                                                | Purpose                  |
| --------------------------------------------------- | ------------------------ |
| `contracts/libraries/ae/keeper/KeeperLib.sol`       | Core keeper logic        |
| `contracts/libraries/ae/keeper/PeelMath.sol`        | Peel amount calculations |
| `contracts/libraries/ae/keeper/LiquidationMath.sol` | Liquidation calculations |
| `contracts/AegisEngine.sol`                         | Keeper entry points      |
| `docs/specs/0410-Keepers-Peel-and-MicroLiq.md`      | Specification document   |

## Best Practices

1. **Monitor vault LTV** to identify liquidation opportunities early
2. **Calculate profitability** before executing keeper operations
3. **Use --simulate** to preview outcomes before execution
4. **Consider MEV** risks in competitive keeper environments
5. **Batch operations** when possible for gas efficiency
6. **Track gas prices** to optimize execution timing
