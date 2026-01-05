---
description: Diagnose and fix bugs through systematic debugging
argument-hint: <description|issue-url> [--trace] [--apply]
allowed-tools: Read(*), Glob(*), Grep(*), Edit(*), Bash(*), Task(subagent_type:debug-assistant), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `description`: Bug description or GitHub issue URL (required)
- `--trace`: Enable detailed execution tracing (flag)
- `--apply`: Apply the fix automatically (flag)
- `--file`: Specific file to focus on (optional)
- `--logs`: Path to relevant log files (optional)

Examples:

- `/fix-bug "users can't log in after password reset"`
- `/fix-bug https://github.com/org/repo/issues/123`
- `/fix-bug "null pointer in parseConfig" --file src/config.ts`
- `/fix-bug "transaction reverts on deposit" --trace --apply`

## Task

Diagnose and fix bugs through systematic debugging:

1. Gather information about the bug
2. Reproduce and isolate the issue
3. Identify root cause
4. Suggest or apply fix
5. Recommend prevention measures

## Process

1. **Gather Info**: Collect bug description, symptoms, context
2. **Fetch Issue**: If URL provided, get issue details via `gh issue view`
3. **Analyze Code**: Find relevant code and trace execution
4. **Diagnose**: Identify root cause through systematic analysis
5. **Fix**: Suggest or apply targeted fix
6. **Verify**: Ensure fix resolves the issue
7. **Prevent**: Recommend tests and improvements

## Commands Used

```bash
# Fetch GitHub issue details
gh issue view <number> --json title,body,comments

# Search for related code
# (uses Grep and Glob tools)

# Run tests to verify fix
# (uses Bash tool)
```

## Delegation

Invoke **debug-assistant** with:

- `problem`: Bug description
- `code`: Relevant code files
- `symptoms`: Observable behaviors
- `context`: Additional context
- `logs`: Log content if provided

## Output

### Diagnosis

```yaml
diagnosis:
  summary: |
    [Brief description of bug and cause]
  severity: critical | high | medium | low
  category: logic | data | integration | race-condition | configuration

investigation:
  symptoms:
    - [observed behavior 1]
    - [observed behavior 2]

  hypotheses:
    - hypothesis: [possible cause]
      likelihood: high | medium | low
      status: confirmed | refuted

  root_cause:
    description: |
      [What's actually wrong]
    location: [file:line]
    mechanism: |
      [Why it happens]
```

### Fix

```yaml
fix:
  description: |
    [What needs to change]
  changes:
    - file: [path]
      line: [line number]
      before: |
        [original code]
      after: |
        [fixed code]
      explanation: |
        [why this fixes it]

  applied: true | false
  verified: true | false

prevention:
  tests:
    - description: [test to add]
      covers: [what this prevents]

  improvements:
    - description: [code improvement]
      prevents: [future issues]
```

## Debugging Strategies

### Reproduce First

- Confirm the bug exists
- Find minimal reproduction
- Identify consistent triggers

### Binary Search

- Narrow down the location
- Comment out code systematically
- Check recent changes

### Trace Execution

- Follow data flow
- Check inputs at each step
- Verify assumptions

### Root Cause Analysis

- Ask "why" repeatedly
- Look for upstream issues
- Consider timing/order

## Common Bug Categories

### Logic Bugs

- Off-by-one errors
- Wrong operators
- Missing edge cases

### Data Bugs

- Null/undefined
- Type mismatches
- Stale data

### Integration Bugs

- API mismatches
- Version conflicts
- Configuration errors

### Solidity-Specific

- Reentrancy
- Integer overflow
- Access control
- Gas issues

## Verification

After fix is applied:

1. Run relevant tests
2. Manually verify the scenario
3. Check for regressions
4. Document the fix
