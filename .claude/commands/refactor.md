---
description: Identify and apply safe refactoring improvements to code
argument-hint: <path> [--goal readability|performance|duplication] [--apply]
allowed-tools: Read(*), Glob(*), Grep(*), Edit(*), Write(*), Task(subagent_type:refactorer), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `path`: File or directory to refactor (required)
- `--goal`: Refactoring goal: `readability` | `performance` | `duplication` | `complexity` | `patterns` | `general`
- `--aggressiveness`: How much to change: `conservative` | `moderate` | `aggressive` (default: moderate)
- `--apply`: Actually apply the refactoring (flag, default: analyze only)
- `--dry-run`: Show changes without applying (flag)

Examples:

- `/refactor src/utils/parser.ts`
- `/refactor src/auth/ --goal duplication`
- `/refactor contracts/Engine.sol --goal complexity --apply`
- `/refactor src/handlers/ --aggressiveness conservative --dry-run`

## Task

Improve code quality through safe refactoring:

1. Analyze code for improvement opportunities
2. Prioritize changes by impact and risk
3. Generate refactoring plan
4. Optionally apply changes

## Modes

### Analyze Only (default)

- Identify code smells and issues
- Suggest improvements
- Estimate impact
- No changes made

### Dry Run

- Show exact changes that would be made
- Preview before/after
- No changes made

### Apply

- Make the actual changes
- Apply incrementally
- Verify each step
- Report results

## Process

1. **Analyze Code**: Identify smells and opportunities
2. **Load Context**: Get project patterns for alignment
3. **Plan Refactoring**: Create step-by-step plan
4. **Apply (if requested)**: Make changes incrementally
5. **Report**: Summarize findings/changes

## Delegation

Invoke **refactorer** with:

- `target`: Code to refactor
- `goal`: From --goal argument
- `aggressiveness`: From --aggressiveness argument
- `context`: Project patterns from context-loader

## Output

### Analysis Mode

```yaml
analysis:
  path: [analyzed path]
  quality_score: [1-10]
  improvement_potential: [1-10]

code_smells:
  - smell: [smell name]
    severity: high | medium | low
    location: [file:line]
    description: [why it's a problem]

refactoring_plan:
  - step: 1
    technique: [refactoring technique]
    target: [what to change]
    impact: [expected improvement]
    risk: low | medium | high

recommendations:
  - [prioritized list of improvements]
```

### Apply Mode

```yaml
execution:
  path: [refactored path]
  status: completed | partial | failed

changes_made:
  - step: [step number]
    technique: [technique used]
    files_modified:
      - file: [path]
        before: |
          [original code]
        after: |
          [refactored code]

quality_improvement:
  before: [score]
  after: [score]

verification:
  tests_passed: true | false
  issues_found: [any new issues]
```

## Refactoring Techniques

| Technique        | When to Use          |
| ---------------- | -------------------- |
| Extract Method   | Long methods         |
| Inline Method    | Trivial delegation   |
| Extract Variable | Complex expressions  |
| Rename           | Unclear names        |
| Move             | Misplaced code       |
| Extract Class    | Large classes        |
| Simplify Logic   | Complex conditionals |
| Remove Dead Code | Unused code          |

## Safety Guidelines

- Never change behavior
- Refactor in small steps
- Ensure tests pass
- Keep changes reversible
- Document assumptions
- Verify type safety
