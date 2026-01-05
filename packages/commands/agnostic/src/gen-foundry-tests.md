---
description: Generate Foundry tests for Solidity contracts - unit, fuzz, invariant, and integration tests
argument-hint: <path> [--type unit|fuzz|invariant|integration|all] [--focus <function>]
allowed-tools: Read(*), Grep(*), Glob(*), Write(*), Task(subagent_type:foundry-test-writer), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- **path**: Path to contract or directory to generate tests for
- **--type**: Test type (unit, fuzz, invariant, integration, all) - default: unit
- **--focus**: Optional specific function or behavior to test
- **--edge-cases**: Flag to emphasize edge case identification (default: true)

Examples:

- `/gen-foundry-tests contracts/AegisEngine.sol`
- `/gen-foundry-tests contracts/AegisEngine.sol --type fuzz`
- `/gen-foundry-tests contracts/ --type invariant`
- `/gen-foundry-tests contracts/AegisEngine.sol --type all --focus deposit`

## Task

Generate comprehensive Foundry test suites:

1. **Analyze target contract(s)** to understand functions and state
2. **Identify test scenarios** based on type and focus
3. **Generate test file(s)** following existing patterns
4. **Include edge cases** and AEGIS-specific invariants

## Workflow

### For Simple Cases (single contract, unit tests)

1. Read the target contract
2. Invoke **foundry-test-writer** with contract content and type

### For Complex Cases (multiple contracts, invariant tests)

1. Invoke **context-loader** to understand dependencies
2. Identify all related contracts and libraries
3. Invoke **foundry-test-writer** with full context
4. Generate handler contracts for invariant tests

## Delegation

Invoke **foundry-test-writer** with:

- `paths`: parsed file paths
- `type`: test type from --type
- `focus`: from --focus if provided
- `context`: existing test patterns and dependencies

## Output Format

```yaml
summary: [overview of generated tests]
strategy:
  approach: [chosen testing approach]
  coverage_areas:
    - [area 1]
    - [area 2]
  invariants_tested:
    - [invariant 1]
    - [invariant 2]

generated_files:
  - path: [test file path]
    type: [unit|fuzz|invariant|integration]
    functions_tested:
      - [function 1]
      - [function 2]
    edge_cases:
      - [edge case 1]
      - [edge case 2]

recommendations:
  - [test improvement suggestion 1]
  - [test improvement suggestion 2]
```

## Test File Naming

| Type | Pattern | Example |
|------|---------|---------|
| unit | `test/<Contract>.t.sol` | `test/AegisEngine.t.sol` |
| fuzz | `test/<Contract>.fuzz.t.sol` | `test/AegisEngine.fuzz.t.sol` |
| invariant | `test/invariants/<Feature>.invariant.t.sol` | `test/invariants/Equity.invariant.t.sol` |
| integration | `test/integration/<Flow>.t.sol` | `test/integration/BorrowRepay.t.sol` |

## AEGIS-Specific Invariants

The generator will include tests for:

1. **Equity Neutrality**

   ```solidity
   function invariant_equityNeutralForBorrowRepay() public {
       // Borrow/repay should not change equityLWad
   }
   ```

2. **Share Price Monotone**

   ```solidity
   function invariant_sharePriceNeverDecreases() public {
       // Share price should only go up or stay same
   }
   ```

3. **Session Cleanup**

   ```solidity
   function invariant_noOrphanedSessions() public {
       // unlockedCount should be 0 after operations
   }
   ```

4. **Collateral Floor**

   ```solidity
   function invariant_sqrtKFloorRespected() public {
       // No vault can be under-collateralized
   }
   ```

5. **Utilization Cap**

   ```solidity
   function invariant_utilizationCapped() public {
       // Utilization should never exceed 95%
   }
   ```

## Examples

### Example 1: Unit Tests

```bash
/gen-foundry-tests contracts/AegisEngine.sol
```

Generates `test/AegisEngine.t.sol` with:

- `test_deposit_increasesEquity`
- `test_withdraw_decreasesEquity`
- `test_borrow_requiresCollateral`
- `test_repay_reducesDebt`

### Example 2: Fuzz Tests

```bash
/gen-foundry-tests contracts/AegisEngine.sol --type fuzz
```

Generates `test/AegisEngine.fuzz.t.sol` with:

- `testFuzz_depositWithBounds(uint256 amount)`
- `testFuzz_borrowWithinLimits(uint256 amount)`
- `testFuzz_repayPartialOrFull(uint256 amount)`

### Example 3: Invariant Tests

```bash
/gen-foundry-tests contracts/ --type invariant
```

Generates:

- `test/invariants/Equity.invariant.t.sol`
- `test/invariants/Handler.sol` (ghost variable tracker)
- Tests for all critical invariants

### Example 4: Integration Tests

```bash
/gen-foundry-tests contracts/ --type integration
```

Generates `test/integration/` with:

- Full deposit-borrow-repay-withdraw flows
- Multi-user scenarios
- Time-dependent interest accrual tests
