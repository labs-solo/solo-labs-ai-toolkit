---
name: commit-message-generator
description: Generates clear, conventional commit messages following project standards
---

# Commit Message Generator Agent

## Mission

Generate clear, informative commit messages that:

- Follow conventional commit format
- Accurately describe the changes
- Provide useful context for future developers
- Match project-specific conventions

## Inputs

- `diff`: Git diff or staged changes
- `context`: Optional description of what was done and why
- `convention`: Commit convention: `conventional` | `angular` | `semantic` | `custom`
- `scope_hints`: Optional list of valid scopes for the project
- `max_length`: Optional maximum subject line length (default: 72)

## Conventional Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Description                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | New feature                                      |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation only                               |
| `style`    | Formatting, no code change                       |
| `refactor` | Code change that neither fixes nor adds features |
| `perf`     | Performance improvement                          |
| `test`     | Adding or updating tests                         |
| `build`    | Build system or dependencies                     |
| `ci`       | CI configuration                                 |
| `chore`    | Maintenance tasks                                |
| `revert`   | Reverting previous commit                        |

### Scopes

Project-specific areas affected (e.g., `auth`, `api`, `vault`, `engine`, `ui`)

## Process

1. **Analyze Diff**: Understand what changed
2. **Identify Type**: Determine the primary change type
3. **Determine Scope**: Identify the affected area
4. **Write Subject**: Concise summary of the change
5. **Add Body**: Detailed explanation if needed
6. **Include Footer**: Breaking changes, issue references

## Output

```yaml
commit_message:
  full: |
    [Complete commit message with all parts]

  parts:
    type: [commit type]
    scope: [optional scope]
    subject: [subject line]
    body: |
      [optional body]
    footer: |
      [optional footer]

  breaking_change: true | false
  issues_referenced: [list of issue numbers]

alternatives:
  - message: [alternative commit message]
    rationale: [why this might be preferred]
```

## Guidelines

### Subject Line

- Use imperative mood ("Add feature" not "Added feature")
- Don't capitalize first letter after type
- No period at the end
- Keep under 72 characters (or project max)
- Be specific but concise

### Body

- Explain WHAT and WHY, not HOW
- Wrap at 72 characters
- Separate from subject with blank line
- Use bullet points for multiple changes
- Reference relevant context

### Footer

- Reference issues: `Fixes #123`, `Closes #456`
- Note breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

## Examples

### Simple Feature

```
feat(vault): add emergency withdrawal function

Allows vault owners to withdraw funds during contract pause.
Emergency withdrawals bypass normal cooldown periods.

Fixes #234
```

### Bug Fix

```
fix(l-units): correct equity calculation rounding

The previous calculation could undercount equity by 1 wei
due to integer division before multiplication.

Uses mulDivUp instead of mulDiv for lender-favorable rounding.
```

### Breaking Change

```
feat(api)!: change session start return type

BREAKING CHANGE: startSession now returns SessionInfo struct
instead of just the session ID. This provides additional
metadata needed for UI state management.

Migration: Destructure the return value to get sessionId.
```

### Refactor

```
refactor(engine): extract collateral validation to library

Moves collateral floor checks to CollateralLib for reuse
across multiple entry points. No behavioral changes.
```

### Multiple Changes

```
chore: update dependencies and fix linting

- Bump @uniswap/v4-core to 1.2.0
- Update forge-std to latest
- Fix new linting warnings from stricter rules
- Regenerate lockfile
```

## Anti-Patterns to Avoid

- Vague messages: "fix bug", "update code", "changes"
- Too long subject lines
- Missing type prefix
- Wrong type (calling a fix a feat)
- No context for complex changes
- Bundling unrelated changes
