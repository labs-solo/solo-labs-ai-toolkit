---
description: Generate comprehensive tests for code based on framework detection
argument-hint: <path> [--framework jest|vitest|mocha|foundry|matchstick] [--type unit|integration|e2e]
allowed-tools: Read(*), Glob(*), Grep(*), Write(*), Task(subagent_type:test-writer), Task(subagent_type:foundry-test-writer), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `path`: File or directory to generate tests for (required)
- `--framework`: Testing framework (auto-detected if not specified)
- `--type`: Test type: `unit` | `integration` | `e2e` | `all` (default: unit)
- `--coverage`: Target coverage areas (e.g., "edge-cases", "error-handling")

Examples:

- `/gen-tests src/utils/parser.ts`
- `/gen-tests src/components/ --type integration`
- `/gen-tests contracts/AegisEngine.sol --framework foundry`
- `/gen-tests src/handlers/ --type unit --coverage edge-cases`

## Task

Generate comprehensive tests by:

1. Analyzing the target code
2. Detecting or using specified framework
3. Identifying test scenarios
4. Generating test files with full coverage

## Framework Detection

Auto-detect based on project files:

| Framework  | Detection Files                     |
| ---------- | ----------------------------------- |
| Jest       | jest.config.\*, package.json (jest) |
| Vitest     | vitest.config._, vite.config._      |
| Mocha      | .mocharc.\*, package.json (mocha)   |
| Foundry    | foundry.toml, forge-std             |
| Matchstick | matchstick.yaml, subgraph.yaml      |

## Process

1. **Analyze Target**: Read and understand the code
2. **Detect Framework**: Determine testing framework
3. **Load Context**: Get relevant context if available
4. **Select Agent**: Choose appropriate test writer
5. **Generate Tests**: Create comprehensive test files

## Delegation

### For Solidity (Foundry)

Invoke **foundry-test-writer** with:

- `paths`: Target file paths
- `type`: Test type
- `focus`: Coverage focus
- `context`: Codebase context

### For TypeScript/JavaScript/AssemblyScript

Invoke **test-writer** with:

- `paths`: Target file paths
- `framework`: Detected or specified framework
- `testType`: Test type
- `requirements`: Coverage requirements
- `context`: Codebase context

## Output

```yaml
summary: |
  [Description of tests generated]

framework: [framework used]
test_type: [type of tests]

files_generated:
  - path: [test file path]
    tests_count: [number of tests]
    coverage:
      functions: [list of functions tested]
      scenarios: [list of scenarios covered]

test_structure:
  - describe: [test suite name]
    tests:
      - [test case 1]
      - [test case 2]

coverage_analysis:
  covered:
    - [what's tested]
  gaps:
    - [what might need additional testing]

run_command: [command to run the tests]
```

## Test Quality Guidelines

- Test behavior, not implementation
- Cover happy paths and edge cases
- Include error scenarios
- Keep tests focused and readable
- Use descriptive test names
- Avoid test interdependence
- Mock external dependencies appropriately

## Framework-Specific Notes

### Foundry

- Uses setUp() pattern
- Supports fuzz testing with vm.assume()
- Invariant tests with handler pattern
- Use forge-std assertions

### Jest/Vitest

- Use describe/it/expect pattern
- Mock modules with jest.mock/vi.mock
- Async testing with async/await
- Snapshot testing when appropriate

### Matchstick (The Graph)

- AssemblyScript test syntax
- Mock events with createMockedFunction
- Assert entity state after handler calls
- Handle BigInt and Bytes properly
