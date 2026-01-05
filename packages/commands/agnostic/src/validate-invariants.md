---
name: validate-invariants
description: Check code against AEGIS spec invariants and safety rules
argument-hint: <scope> [--spec <path>] [--code <path>] [--strict]
allowed-tools: Read(*), Grep(*), Glob(*), Task(subagent_type:aegis-architect), Task(subagent_type:context-loader)
---

# /validate-invariants Command

Validate AEGIS protocol code against spec invariants and safety rules from `0500-Invariants-and-Safety-Rules.md`.

## Usage

```bash
/validate-invariants <scope> [--spec <path>] [--code <path>] [--strict]
```

## Arguments

- `<scope>`: What to validate
  - `all` - Check all invariants
  - `session` - Session cleanup and lifecycle invariants
  - `equity` - Equity neutrality for borrow/repay
  - `collateral` - sqrt(K) floor and solvency invariants
  - `hooks` - Hook gating and pool validation
  - `keeper` - Vault locking requirements for keepers
- `--spec <path>`: Optional path to spec file (defaults to `docs/specs/0500-Invariants-and-Safety-Rules.md`)
- `--code <path>`: Optional path to code directory (defaults to `contracts/`)
- `--strict`: Fail on any potential violation (default: warn only)

## Examples

```bash
/validate-invariants all
/validate-invariants equity --strict
/validate-invariants session --code contracts/libraries/ae/session/
/validate-invariants collateral
/validate-invariants keeper --strict
```

## Task

Validate AEGIS protocol invariants by:

1. **Load invariant definitions** from spec documents
2. **Map invariants** to relevant code locations
3. **Static analysis** to check each invariant
4. **Report** violations, warnings, and confirmations

## Invariant Definitions

### Core Invariants (from 0500-Invariants-and-Safety-Rules.md)

| Invariant | Description | Key Code Locations |
|-----------|-------------|-------------------|
| **Frame delta-zero** | PM enforces all currency deltas sum to zero | `AegisEngine.sol`, settlement logic |
| **Session cleanup** | `unlockedCount == 0`, no pending NFT attaches at session end | `SessionLib.sol`, `aeEnd()` |
| **Equity neutrality** | `equityLWad` only changes via deposits/fee mints, not borrow/repay | `VaultLib.sol`, `MarketLib.sol` |
| **Share price monotone** | Only minted L counts; one-sided fee residues stay off-equity | `MarketLib.sol` |
| **Hook gating** | All pools require `hookAllowed[PoolKey.hooks]` | `AegisHook.sol` |
| **Vault session locks** | Keepers require vault locked; users require vault unlocked | `KeeperLib.sol`, access control |

### Key Constants

```solidity
uint256 constant BPS_DENOMINATOR = 10_000;
uint256 constant UTILIZATION_CAP_BPS = 9_500;   // 95%
uint32  constant MAX_LTV_BPS = 9_800;           // 98%
uint32  constant HARD_LTV_BPS = 9_900;          // 99%
```

## Workflow

### Step 1: Load Spec Context

1. Read `0500-Invariants-and-Safety-Rules.md` (or custom --spec path)
2. Parse invariant definitions and requirements
3. Identify code patterns that must hold

### Step 2: Map to Code

For each invariant, identify:

- Entry points where invariant must be checked
- State variables involved
- Functions that could violate the invariant

### Step 3: Static Analysis

Invoke **context-loader** to gather relevant code, then **aegis-architect** to analyze:

- Check that invariant conditions are enforced
- Look for missing guards or validation
- Identify potential violation paths

### Step 4: Report Findings

Generate structured report with:

- Pass/warn/violation status for each invariant
- Code locations checked
- Evidence (code snippets)
- Recommendations for fixes

## Delegation

### For Comprehensive Analysis

1. First invoke **context-loader** with:
   - `scope`: parsed scope
   - `paths`: code paths to analyze
   - `mode`: invariant-check

2. Then invoke **aegis-architect** with:
   - `task`: validate-invariants
   - `scope`: parsed scope
   - `context`: gathered code context
   - `strict`: from --strict flag

## Output Format

```yaml
summary:
  scope: [analyzed scope]
  total_invariants: [count]
  passed: [count]
  warnings: [count]
  violations: [count]
  strict_mode: true|false

invariants:
  - name: "Equity Neutrality"
    spec_ref: "0500-Invariants-and-Safety-Rules.md#equity-neutrality"
    status: passed|warning|violation
    description: "Borrow/repay must not change equityLWad"
    locations_checked:
      - file: contracts/libraries/ae/vault/VaultLib.sol
        lines: "120-145"
        finding: "Equity delta correctly computed and verified"
      - file: contracts/AegisEngine.sol
        lines: "456-478"
        finding: "Borrow operation preserves equity"
    evidence: |
      // Code snippet showing invariant enforcement
      require(equityDelta == 0, "EquityNeutralityViolation");
    confidence: high|medium|low

  - name: "Session Cleanup"
    spec_ref: "0500-Invariants-and-Safety-Rules.md#session-cleanup"
    status: passed|warning|violation
    description: "unlockedCount must be 0 at session end"
    locations_checked:
      - file: contracts/libraries/ae/session/SessionLib.sol
        lines: "89-102"
        finding: "Cleanup check present in aeEnd()"
    evidence: |
      require(unlockedCount == 0, "SessionNotCleanedUp");
    confidence: high|medium|low

  - name: "Frame Delta Zero"
    spec_ref: "0500-Invariants-and-Safety-Rules.md#frame-delta-zero"
    status: passed|warning|violation
    ...

recommendations:
  - priority: high|medium|low
    invariant: "Equity Neutrality"
    suggestion: "Add explicit equity check after debt modifications"
    rationale: "Prevents silent equity drift over time"
    location: contracts/AegisEngine.sol:467

  - priority: medium
    invariant: "Session Cleanup"
    suggestion: "Add defensive check for pending NFT attaches"
    rationale: "Edge case where attach fails silently"
    location: contracts/libraries/ae/session/SessionLib.sol:95

spec_coverage:
  covered_invariants:
    - "Equity Neutrality"
    - "Session Cleanup"
    - "Frame Delta Zero"
  uncovered_invariants:
    - description: "[Any invariants not fully verified]"
      reason: "[Why coverage is incomplete]"
```

## Scope Details

### `all` Scope

Checks all 6 core invariants across the entire codebase.

### `session` Scope

Focuses on:

- `SessionLib.sol` - Transient storage management
- `aeStart()` / `aeEnd()` - Session lifecycle
- `VaultSessionTracker` - Per-vault session state
- Cleanup requirements at session boundaries

### `equity` Scope

Focuses on:

- `VaultLib.sol` - Vault accounting
- `MarketLib.sol` - Market state and equity
- `LMath.sol` - L-unit calculations
- Borrow/repay operations

### `collateral` Scope

Focuses on:

- `CollateralFloorMath.sol` - sqrt(K) calculations
- LTV threshold enforcement
- Solvency checks before operations

### `hooks` Scope

Focuses on:

- `AegisHook.sol` - Hook implementation
- `hookAllowed` mapping validation
- Pool registration requirements

### `keeper` Scope

Focuses on:

- `KeeperLib.sol` - Keeper operations
- Vault lock state requirements
- Peel and liquidation guards

## Common Findings

### Violation Examples

```text
VIOLATION: Equity Neutrality
  Location: AegisEngine.sol:456
  Issue: Debt modification without equity verification
  Impact: Equity could drift over time
  Fix: Add require(equityDelta == 0) after debt change
```

### Warning Examples

```text
WARNING: Session Cleanup
  Location: SessionLib.sol:89
  Issue: Missing explicit check for pendingAttaches
  Impact: Edge case could leave orphaned state
  Fix: Add require(pendingAttaches == 0) in aeEnd()
```

## Integration with Specs

This command reads from AEGIS specification documents:

- `docs/specs/0500-Invariants-and-Safety-Rules.md` - Primary invariant definitions
- `docs/specs/0400-Behavioral-Flows.md` - Expected operation flows
- `docs/specs/0150-Statement-of-Intended-Behavior.md` - Canonical behavior

## Best Practices

1. **Run regularly** during development to catch regressions
2. **Use --strict** in CI/CD pipelines
3. **Review warnings** even if not violations
4. **Update specs** if intentional behavior changes
5. **Document exceptions** when invariants are intentionally relaxed
