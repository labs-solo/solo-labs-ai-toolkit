---
description: Debug L-unit accounting issues - trace flows, validate equity neutrality, check precision
argument-hint: <scenario> [--function <name>] [--trace]
allowed-tools: Read(*), Grep(*), Glob(*), Task(subagent_type:l-unit-accountant)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- **scenario**: Operation type to debug (`borrow`, `repay`, `deposit`, `withdraw`, `all`)
- **--function**: Optional specific function to analyze
- **--trace**: Include step-by-step L-unit trace (default: false)

Examples:

- `/debug-l-units borrow --trace`
- `/debug-l-units repay --function _applyDebtDelta`
- `/debug-l-units all`
- `/debug-l-units deposit`

## Task

Debug L-unit accounting by:

1. **Identifying relevant functions** for the scenario
2. **Tracing L-unit flows** through function calls
3. **Validating equity neutrality invariant**
4. **Checking PIPS precision** and rounding

## Delegation

Invoke **l-unit-accountant** with:

- `scenario`: parsed scenario type
- `function`: from --function if provided
- `trace`: true if --trace flag present
- `context`: relevant code snippets

## Output Format

```yaml
summary: [brief description of findings]
scenario: [operation type analyzed]

functions_analyzed:
  - name: [function name]
    file: [file path]
    purpose: [what it does]

l_unit_trace: # Only if --trace specified
  - step: 1
    function: [function name]
    l_units_before: [value]
    l_units_after: [value]
    delta: [change amount]
    explanation: [what happened]

invariant_status:
  equity_neutrality: [preserved|violated]
  violations:
    - description: [what went wrong]
      location: [file:line]
      impact: [severity]

precision_issues:
  - issue: [description]
    location: [file:line]
    cause: [WAD/PIPS mismatch, rounding, etc.]
    fix: [suggested fix]

recommendations:
  - priority: [high|medium|low]
    description: [what to do]
    rationale: [why this helps]
```

## Common Issues Detected

### Equity Neutrality Violations

```
VIOLATION: equityLWad changed during borrow
  Location: AegisEngine.sol:456
  Before: 1000000000000000000000
  After:  1000000000000000000001
  Delta:  1 (should be 0)
```

### PIPS/WAD Scaling Errors

```
PRECISION ERROR: Mixed precision in calculation
  Location: MarketLib.sol:123
  Issue: Multiplied WAD value by PIPS without scaling
  Fix: Divide by PIPS_DENOMINATOR after multiplication
```

### Rounding Direction Issues

```
ROUNDING WARNING: User-favorable rounding detected
  Location: VaultLib.sol:789
  Issue: Using mulDivDown when should use mulDivUp
  Impact: Protocol loses small amounts over time
```

## Debug Checklist

The command will verify:

- [ ] All L-unit operations use WAD (1e18) precision
- [ ] Percentage calculations use PIPS (1e6)
- [ ] Equity neutrality maintained for borrow/repay
- [ ] Rounding direction favors protocol
- [ ] No division-before-multiplication issues
- [ ] Interest accrual happens before state changes

## Key Files Examined

| Scenario | Primary Files                                  |
| -------- | ---------------------------------------------- |
| borrow   | `AegisEngine.sol`, `VaultLib.sol`, `LMath.sol` |
| repay    | `AegisEngine.sol`, `VaultLib.sol`, `LMath.sol` |
| deposit  | `AegisEngine.sol`, `MarketLib.sol`             |
| withdraw | `AegisEngine.sol`, `MarketLib.sol`             |
| all      | All of the above                               |

## Examples

### Example 1: Debug Borrow Flow

```bash
/debug-l-units borrow --trace
```

Traces through:

1. Collateral calculation
2. Debt principal update
3. Equity check (should remain unchanged)
4. Token transfer via PM.unlock

### Example 2: Debug Specific Function

```bash
/debug-l-units repay --function _applyDebtDelta
```

Focuses on:

- Input validation
- Interest calculation
- Principal reduction
- Equity neutrality verification

### Example 3: Full Audit

```bash
/debug-l-units all
```

Comprehensive check of:

- All L-unit operations
- All invariants
- All precision handling
- Cross-function interactions
