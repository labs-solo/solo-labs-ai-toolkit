---
description: Review a pull request for code quality, correctness, and best practices
argument-hint: <pr-number|pr-url> [--focus security|performance|correctness]
allowed-tools: Bash(gh:*), Read(*), Glob(*), Grep(*), Task(subagent_type:pr-reviewer), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `pr`: Pull request number or URL (required)
- `--focus`: Review focus: `security` | `performance` | `correctness` | `all`
- `--severity`: Minimum severity to report: `critical` | `major` | `minor` | `info`
- `--files`: Specific files to focus on (comma-separated)

Examples:

- `/review-pr 123`
- `/review-pr https://github.com/org/repo/pull/456`
- `/review-pr 123 --focus security`
- `/review-pr 123 --severity major --files src/auth/`

## Task

Review the pull request by:

1. Fetching PR details and diff
2. Analyzing changes for issues
3. Checking alignment with patterns
4. Providing constructive feedback

## Process

1. **Fetch PR**: Get PR metadata and diff via `gh pr view` and `gh pr diff`
2. **Load Context**: Get codebase patterns if available
3. **Analyze Changes**: Review each changed file
4. **Delegate Review**: Invoke pr-reviewer agent
5. **Format Output**: Present findings clearly

## Commands Used

```bash
# Get PR details
gh pr view <number> --json title,body,files,additions,deletions

# Get PR diff
gh pr diff <number>

# Check PR status
gh pr checks <number>
```

## Delegation

Invoke **pr-reviewer** with:

- `pr`: PR diff and metadata
- `focus`: From --focus argument
- `severity_threshold`: From --severity argument
- `context`: Codebase patterns from context-loader

## Output

```yaml
summary:
  pr_number: [number]
  title: [PR title]
  verdict: approve | request_changes | comment
  risk_level: low | medium | high | critical

statistics:
  files_changed: [count]
  lines_added: [count]
  lines_removed: [count]
  issues_found: [count by severity]

issues:
  - file: [file path]
    line: [line number]
    severity: critical | major | minor
    category: [issue category]
    description: |
      [What's wrong]
    suggestion: |
      [How to fix]

praise:
  - [What was done well]

questions:
  - [Clarifying questions about changes]

recommendation: |
  [Overall recommendation and next steps]
```

## Review Categories

### Correctness

- Logic errors
- Edge case handling
- Type safety

### Security

- Input validation
- Auth/authz issues
- Injection vulnerabilities

### Performance

- Inefficient algorithms
- N+1 queries
- Memory issues

### Maintainability

- Code clarity
- Test coverage
- Documentation

## Integration

After review:

- **approve**: PR can be merged
- **request_changes**: Author should address issues
- **comment**: Non-blocking feedback provided

Use `gh pr review` to submit the review:

```bash
gh pr review <number> --approve
gh pr review <number> --request-changes --body "..."
gh pr review <number> --comment --body "..."
```
