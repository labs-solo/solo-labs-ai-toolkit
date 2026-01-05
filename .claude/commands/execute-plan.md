---
description: Execute an approved implementation plan step by step
argument-hint: <plan-file.md> [--step <n>] [--dry-run]
allowed-tools: Read(*), Write(*), Edit(*), Glob(*), Grep(*), Bash(*), Task(*)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `plan_file`: Path to the plan file to execute (required)
- `--step`: Execute only a specific step number (optional)
- `--dry-run`: Show what would be done without making changes (optional flag)
- `--continue`: Resume from the last completed step (optional flag)

Examples:

- `/execute-plan 20250115-add-vault-feature.md`
- `/execute-plan plans/auth-refactor.md --step 3`
- `/execute-plan implementation-plan.md --dry-run`
- `/execute-plan implementation-plan.md --continue`

## Task

Execute the implementation plan by:

1. Reading and parsing the plan file
2. Executing each step in order (or specified step)
3. Verifying completion of each step
4. Reporting progress and any issues

## Process

### Normal Execution

1. **Read Plan**: Load the plan file
2. **Validate**: Ensure plan has required structure
3. **Execute Steps**: For each step:
   - Announce what will be done
   - Make the changes
   - Verify success
   - Report completion
4. **Summary**: Provide overall execution report

### Dry Run Mode

1. Read and parse the plan
2. For each step, describe what would be done
3. Identify potential issues or conflicts
4. No actual changes made

### Step-by-Step Mode

1. Execute only the specified step
2. Useful for complex plans or debugging
3. Track which steps are complete

## Output

```yaml
execution_summary:
  plan_file: [path]
  mode: full | step | dry-run
  status: completed | partial | failed

steps_executed:
  - step: 1
    title: [step title]
    status: completed | skipped | failed
    changes:
      - file: [path]
        action: created | modified | deleted
    notes: [any relevant notes]

  - step: 2
    # ... continues

files_changed:
  - path: [file path]
    action: created | modified | deleted
    step: [which step made this change]

issues_encountered:
  - step: [step number]
    issue: [what went wrong]
    resolution: [how it was handled]

next_steps:
  - [Recommended follow-up actions]
```

## Workflow Integration

This command is **Step 4** of the implementation workflow:

1. Explore → 2. Plan → 3. Review → 4. **Execute**

### After Execution

- Run tests to verify changes work correctly
- Create a commit with the changes
- Consider creating a PR for review

## Safety Guidelines

- Always verify plan has been reviewed/approved
- Stop on errors and report clearly
- Don't make changes outside the plan scope
- Preserve ability to rollback (use git)
- Report any unexpected conditions
