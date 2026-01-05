---
description: Review an implementation plan for completeness, correctness, and alignment with codebase patterns
argument-hint: <plan-file.md>
allowed-tools: Read(*), Glob(*), Grep(*), Task(subagent_type:plan-reviewer), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `plan_file`: Path to the plan file to review (required)
- `--focus`: Optional focus area (e.g., "security", "performance")
- `--strict`: Enable strict review mode (flag all minor issues)

Examples:

- `/review-plan 20250115-add-vault-feature.md`
- `/review-plan plans/auth-refactor.md --focus security`
- `/review-plan implementation-plan.md --strict`

## Task

Review the implementation plan to ensure it is:

1. Complete and actionable
2. Aligned with existing codebase patterns
3. Technically sound and feasible
4. Appropriately scoped (not over-engineered)

## Process

1. **Read the Plan**: Load and parse the plan file
2. **Load Context**: If context-loader findings are available, use them for pattern verification
3. **Delegate Review**: Invoke plan-reviewer agent
4. **Return Results**: Structured review with verdict and feedback

## Delegation

Invoke **plan-reviewer** with:

- `plan`: Contents of the plan file
- `focus`: From --focus argument if provided
- `codebase_context`: From context-loader if available

## Output

Return structured review:

```yaml
review_summary: |
  [2-3 sentence assessment]

verdict: approved | needs_revision | rejected

plan_file: [path to reviewed plan]

issues:
  critical:
    - description: [issue]
      suggestion: [fix]
  major:
    - description: [issue]
      suggestion: [fix]
  minor:
    - description: [issue]
      suggestion: [fix]

strengths:
  - [What the plan does well]

next_steps:
  - [Recommended action based on verdict]
```

## Workflow Integration

This command is **Step 3** of the implementation workflow:

1. Explore → 2. Plan → 3. **Review** → 4. Execute

### After Review

Based on the verdict:

- **approved**: Proceed with `/execute-plan <plan-file.md>`
- **needs_revision**: Address issues and re-review
- **rejected**: Create a new plan with `/plan <task>`
