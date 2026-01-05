---
name: analyze-session
description: Analyze EIP-1153 session flows, transient storage usage, and phase execution
argument-hint: <operation> [--trace] [--phase <0|1|both>] [--vault <id>]
allowed-tools: Read(*), Grep(*), Glob(*), Task(subagent_type:aegis-architect), Task(subagent_type:context-loader)
---

# /analyze-session Command

Analyze AEGIS protocol session flows including EIP-1153 transient storage, two-phase execution, and session lifecycle management.

## Usage

```bash
/analyze-session <operation> [--trace] [--phase <0|1|both>] [--vault <id>]
```

## Arguments

- `<operation>`: Operation to analyze
  - `deposit` - Analyze deposit session flow
  - `withdraw` - Analyze withdrawal session flow
  - `borrow` - Analyze borrow session flow
  - `repay` - Analyze repay session flow
  - `liquidate` - Analyze liquidation session flow
  - `all` - Analyze all operation types
- `--trace`: Show step-by-step transient storage changes
- `--phase <0|1|both>`: Focus on specific execution phase
  - `0` - Phase-0 (PM locked) - vault operations
  - `1` - Phase-1 (PM unlocked) - token I/O
  - `both` - Analyze both phases (default)
- `--vault <id>`: Analyze specific vault session patterns

## Examples

```bash
/analyze-session deposit --trace
/analyze-session borrow --phase 0
/analyze-session all
/analyze-session liquidate --trace --phase both
/analyze-session withdraw --vault 0x123
```

## Task

Analyze AEGIS session mechanics by:

1. **Identify session entry/exit points** (`aeStart`, `aeEnd`)
2. **Map transient storage slots** used during operation
3. **Trace state changes** through the operation lifecycle
4. **Verify session cleanup** invariants
5. **Identify potential issues** (reentrancy, state leakage)

## Two-Phase Execution Model

```text
┌─────────────────────────────────────────────────────────────┐
│                    AEGIS Session Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 0 (PM Locked)          Phase 1 (PM Unlocked)         │
│  ─────────────────────        ──────────────────────        │
│  • Vault state changes        • Token transfers              │
│  • Debt modifications         • Delta settlement             │
│  • Collateral updates         • ERC-20 movements             │
│  • Session tracking           • Final cleanup                │
│                                                              │
│  aeStart() ──────────────────────────────────────> aeEnd()  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Transient Storage Slots (EIP-1153)

| Slot | Purpose | Lifecycle |
|------|---------|-----------|
| `VaultSessionTracker` | Per-vault session state | Written at aeStart, cleared at aeEnd |
| `MarketAccrualState` | Interest accrual cache | Computed once per session per market |
| `unlockedCount` | Number of unlocked vaults | Must be 0 at session end |
| `pendingAttaches` | NFTs pending attachment | Must be 0 at session end |

## Workflow

### Step 1: Load Operation Context

1. Identify the operation type from arguments
2. Load relevant contract code (`AegisEngine.sol`, `SessionLib.sol`)
3. Map the operation to its entry points

### Step 2: Trace Session Flow

For the specified operation:

1. Find `aeStart()` call and initial state setup
2. Track all transient storage writes/reads
3. Follow state transitions through phases
4. Locate `aeEnd()` and cleanup verification

### Step 3: Analyze Phase Execution

For each phase:

- **Phase 0**: What vault/market state changes occur?
- **Phase 1**: What token movements and settlements happen?

### Step 4: Verify Invariants

Check session-related invariants:

- `unlockedCount == 0` at end
- No pending NFT attaches
- All deltas settled

## Delegation

Invoke **aegis-architect** with:

- `task`: analyze-session
- `operation`: parsed operation type
- `trace`: from --trace flag
- `phase_focus`: from --phase argument
- `vault_id`: from --vault argument (if provided)

For deep analysis, first invoke **context-loader** to gather session-related code.

## Output Format

```yaml
operation: [analyzed operation]
phase_focus: [0|1|both]

session_lifecycle:
  entry_point: "aeStart()"
  entry_file: "contracts/AegisEngine.sol"
  entry_line: 234
  exit_point: "aeEnd()"
  exit_file: "contracts/AegisEngine.sol"
  exit_line: 567
  nested_calls: [count of internal calls]

transient_storage:
  slots_used:
    - slot: "VaultSessionTracker"
      purpose: "Tracks vault lock state and session data"
      written_by: "aeStart()"
      read_by: ["_checkVaultUnlocked()", "_applyDebtDelta()"]
      cleared_by: "aeEnd()"

    - slot: "MarketAccrualState"
      purpose: "Caches interest accrual for session"
      written_by: "_accrueInterest()"
      read_by: ["_computeDebt()", "_getSharePrice()"]
      cleared_by: "aeEnd()"

    - slot: "unlockedCount"
      purpose: "Tracks number of unlocked vaults"
      written_by: "_unlockVault()"
      read_by: ["aeEnd()"]
      cleared_by: "Implicitly zero at session end"

  storage_trace:  # if --trace specified
    - step: 1
      function: "aeStart()"
      slot: "VaultSessionTracker"
      action: "write"
      value_before: "0x0"
      value_after: "0x01...locked"

    - step: 2
      function: "_unlockVault()"
      slot: "unlockedCount"
      action: "write"
      value_before: "0"
      value_after: "1"

    - step: 3
      function: "_deposit()"
      slot: "MarketAccrualState"
      action: "write"
      value_before: "0x0"
      value_after: "0x...accrued"

    - step: 4
      function: "aeEnd()"
      slot: "unlockedCount"
      action: "read"
      value: "0"
      check: "require == 0"

phase_analysis:
  phase_0:
    description: "PM locked - vault operations without token movement"
    duration: "Lines 234-456"
    operations:
      - "Vault state initialization"
      - "Debt principal calculation"
      - "Collateral verification"
      - "Interest accrual caching"
    state_changes:
      - variable: "vault.debtPrincipalL"
        change: "Updated with new borrow amount"
      - variable: "market.totalBorrowedL"
        change: "Incremented by borrow amount"

  phase_1:
    description: "PM unlocked - token I/O and settlement"
    duration: "Lines 457-567"
    operations:
      - "Token transfer execution"
      - "Delta settlement with PM"
      - "ERC-6909 share minting"
    settlements:
      - currency: "token0"
        delta: "+borrowAmount"
        direction: "Protocol to User"
      - currency: "token1"
        delta: "0"
        direction: "N/A"

invariant_checks:
  session_cleanup:
    status: passed|failed
    unlocked_count_at_end: 0
    pending_attaches: 0
    evidence: "require(unlockedCount == 0) at line 567"

  frame_delta_zero:
    status: passed|failed
    currency_deltas:
      token0: 0
      token1: 0
    evidence: "PM.settle() ensures delta-zero"

potential_issues:
  - type: "reentrancy"
    location: "AegisEngine.sol:345"
    description: "External call before state update"
    severity: low
    mitigation: "Protected by session lock"

  - type: "state_leak"
    location: "SessionLib.sol:89"
    description: "Transient slot not explicitly cleared"
    severity: medium
    mitigation: "EIP-1153 auto-clears at transaction end"

  - type: "cleanup_failure"
    location: "AegisEngine.sol:567"
    description: "Missing check for edge case X"
    severity: low
    mitigation: "Add explicit require() check"

recommendations:
  - priority: medium
    area: "Session cleanup"
    suggestion: "Add explicit clear for MarketAccrualState"
    rationale: "Defense in depth for transient storage"

  - priority: low
    area: "Phase transition"
    suggestion: "Add event emission at phase boundary"
    rationale: "Improves debuggability and monitoring"
```

## Operation-Specific Analysis

### Deposit Flow

```text
aeStart() -> _unlockVault() -> _deposit() -> _mintShares() -> aeEnd()
    │              │               │              │            │
    └─ Session     └─ Vault        └─ Liquidity   └─ ERC-6909  └─ Cleanup
       init           unlock          add            mint          verify
```

### Borrow Flow

```text
aeStart() -> _unlockVault() -> _borrow() -> _updateDebt() -> aeEnd()
    │              │               │              │            │
    └─ Session     └─ Vault        └─ Collateral  └─ Principal └─ Cleanup
       init           unlock          check          update        verify
```

### Liquidation Flow

```text
aeStart() -> _lockVault() -> _liquidate() -> _seizeCollateral() -> aeEnd()
    │              │               │                │               │
    └─ Session     └─ Keeper       └─ Solvency     └─ Transfer     └─ Cleanup
       init           access          check           collateral      verify
```

## Key Files Analyzed

| File | Purpose |
|------|---------|
| `contracts/AegisEngine.sol` | Main session entry/exit points |
| `contracts/libraries/ae/session/SessionLib.sol` | Transient storage management |
| `contracts/libraries/ae/session/VaultSessionTracker.sol` | Per-vault session state |
| `contracts/libraries/ae/market/MarketAccrualState.sol` | Interest accrual caching |

## Best Practices

1. **Use --trace** for debugging session issues
2. **Check phase boundaries** when adding new operations
3. **Verify cleanup** for any new transient storage slots
4. **Test reentrancy** scenarios with session locks
5. **Monitor gas** usage of transient storage operations
