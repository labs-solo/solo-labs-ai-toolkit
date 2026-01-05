---
name: split-stack
description: Automatically split a monolithic branch with many changes into a logical, reviewable stack of PRs using semantic analysis and Graphite.
argument-hint: [base-branch]
allowed-tools: Bash(git rev-parse:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(git check-ref-format:*), Bash(git ls-files:*), Bash(git rev-list:*), Bash(git fetch:*), Bash(npx nx:*), Bash(which:*), Read(*), Grep(*), Glob(*), AskUserQuestion(*), Task(subagent_type:stack-splitter), mcp__graphite__run_gt_cmd(*), mcp__graphite__learn_gt(*), mcp__nx-mcp__nx_project_details(*)
---

# Split Stack

Automatically split a monolithic branch with many changes into a logical, reviewable stack of PRs using semantic analysis and Graphite (gt).

## Usage

```bash
/split-stack           # Split current branch from main
/split-stack develop   # Split current branch from develop
```

## Prerequisites

Before using this command, ensure you have:

- **Graphite CLI** installed: `npm install -g @withgraphite/graphite-cli@latest`
- **Repository initialized** with Graphite: `gt repo init`
- **Clean working directory**: No uncommitted changes (`git status` should be clean)
- **Feature branch** with 3+ commits to split
- **Git worktree support** (Git 2.5+)

To verify your setup:

```bash
gt --version  # Should show 1.0.0 or higher
git status    # Should show "nothing to commit, working tree clean"
```

## Overview

When you've built many features/changes in a single branch (common during experimentation), this command helps you break it into a logical, reviewable stack of PRs automatically.

**How it works:**

1. **Analyze Changes**: Examines all commits and file changes since the branch diverged
2. **Semantic Grouping**: Groups related changes by functionality, not just files
3. **Dependency Analysis**: Uses Nx project graph to understand dependencies
4. **Plan Generation**: Creates a logical split plan optimized for reviewability
5. **User Approval**: Presents the plan and waits for your approval/modifications
6. **Execute Splits**: Uses `gt split` to create the stack

## Workflow

### Step 1: Detect Current State

First, understand the current branch and its relationship to the base branch:

```bash
# Validate branch name format and security
validate_branch_name() {
  local branch="$1"

  # Check for valid git ref format
  if ! git check-ref-format "refs/heads/$branch" 2>/dev/null; then
    echo "Error: Invalid branch name format: $branch"
    exit 1
  fi

  # Additional check for shell metacharacters (security)
  if [[ "$branch" =~ [;\|\&\$\`\(\)\<\>] ]]; then
    echo "Error: Branch name contains invalid characters: $branch"
    exit 1
  fi

  # Verify branch actually exists
  if ! git rev-parse --verify "refs/heads/$branch" >/dev/null 2>&1; then
    echo "Error: Branch does not exist: $branch"
    exit 1
  fi
}

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Determine base branch (default: main)
BASE_BRANCH=${1:-main}

# Validate both branches
validate_branch_name "$CURRENT_BRANCH"
validate_branch_name "$BASE_BRANCH"

# Ensure we're on a feature branch
if [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]] || [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "master" ]]; then
  echo "Error: Cannot split stack from main/master branch"
  echo "Please check out a feature branch first"
  exit 1
fi

echo "Analyzing branch: $CURRENT_BRANCH"
echo "Base branch: $BASE_BRANCH"
```

### Step 2: Analyze All Changes

Gather comprehensive information about the changes:

```bash
# Get all commits since divergence
git log --oneline "$BASE_BRANCH..$CURRENT_BRANCH"

# Get full diff since divergence
git diff "$BASE_BRANCH...$CURRENT_BRANCH" --stat

# Get list of all changed files with change types
git diff "$BASE_BRANCH...$CURRENT_BRANCH" --name-status

# Get detailed diff for semantic analysis
git diff "$BASE_BRANCH...$CURRENT_BRANCH"
```

**Key analysis points:**

- Total number of commits
- Total lines changed
- Files modified by directory/package
- Types of changes (A=added, M=modified, D=deleted, R=renamed)

### Step 3: Semantic Analysis with Stack Splitter Agent

Use the specialized `stack-splitter` agent to analyze changes semantically:

```typescript
const analysisResult = await Task({
  subagent_type: 'stack-splitter',
  description: 'Analyze branch changes semantically',
  prompt: `
Analyze the changes in branch "${CURRENT_BRANCH}" since it diverged from "${BASE_BRANCH}".

Current branch: ${CURRENT_BRANCH}
Base branch: ${BASE_BRANCH}

Commits:
${commits}

File changes:
${fileChanges}

Full diff:
${fullDiff}

Your task:
1. Semantically group changes into logical units (features, bug fixes, refactors, etc.)
2. Consider Nx project dependencies and structure
3. Identify clear boundaries between different functional areas
4. Optimize for reviewability - each PR should tell a coherent story
5. Ensure dependencies are ordered correctly (foundational changes first)

Provide a structured split plan with:
- PR title and description for each split
- List of commits/files to include in each PR
- Rationale for the grouping
- Dependencies between PRs in the stack
- Estimated reviewability score (1-10) for each PR
`,
});
```

### Step 4: Present the Split Plan

Display the proposed split plan to the user with PR title, commits, files, rationale, dependencies, and reviewability score for each PR in the stack.

### Step 5: Get User Approval

Ask the user if they approve the plan or want modifications:

- Approve and Execute
- Modify Plan
- Review Manually
- Cancel

### Step 6: Execute Splits with Graphite

If approved, execute the splits using `gt split`.

**Important Notes about `gt split`:**

- `gt split` is interactive - you'll be prompted to select commits
- It creates a new branch at the specified commit
- Automatically restacks dependent branches
- Each split becomes a separate PR in the stack

## Semantic Analysis Principles

The stack-splitter agent follows these principles when analyzing changes:

### 1. Logical Boundaries

Group changes that:

- Implement the same feature or fix the same bug
- Share the same domain/context (auth, payments, UI, etc.)
- Have natural dependencies (types -> implementation -> tests -> integration)

### 2. Dependency Awareness

- Use Nx project graph to understand package dependencies
- Foundational changes go at the bottom of the stack
- Integration/glue code goes at the top
- Ensure each PR can be reviewed independently of PRs above it

### 3. Reviewability Optimization

Each PR should:

- Tell a coherent story with a clear purpose
- Be small enough to review in 15-30 minutes
- Include tests relevant to its changes
- Have a descriptive title and description
- Not mix unrelated concerns

### 4. Stack Depth Consideration

- Prefer shallow stacks (2-4 PRs) over deep ones (5+ PRs)
- Each additional level adds review coordination overhead
- Balance granularity with practical reviewability

### 5. File Grouping Patterns

Common patterns for grouping files:

- **Feature pattern**: types -> implementation -> tests -> docs
- **Vertical slice**: backend API -> frontend UI -> integration
- **Refactor pattern**: extract -> replace -> cleanup
- **Package pattern**: all changes to one package in one PR (if logical)

## Best Practices

### Before Running

1. **Commit all changes**: Ensure all work is committed (not necessarily pushed)
2. **Clean working directory**: No uncommitted changes
3. **Up-to-date base**: Fetch latest from base branch (`git fetch origin`)

### During Execution

1. **Review the plan carefully**: Does the grouping make sense?
2. **Consider your reviewers**: What size PRs work best for your team?
3. **Think about dependencies**: Can PR #2 be reviewed if PR #1 isn't merged yet?

### After Splitting

1. **Review each PR individually**: `gh pr view <number>` or open in browser
2. **Check CI status**: Ensure all PRs pass tests
3. **Add context to PR descriptions**: Reference the stack structure
4. **Use Graphite dashboard**: View and manage your stack at graphite.dev

## Error Handling

### No Changes to Split

```bash
if [[ -z "$(git log --oneline "$BASE_BRANCH..$CURRENT_BRANCH")" ]]; then
  echo "Error: No commits found between $BASE_BRANCH and $CURRENT_BRANCH"
  exit 1
fi
```

### Too Few Changes

```bash
COMMIT_COUNT=$(git log --oneline "$BASE_BRANCH..$CURRENT_BRANCH" | wc -l)

if [[ $COMMIT_COUNT -lt 2 ]]; then
  echo "Warning: This branch only has $COMMIT_COUNT commit(s)"
  echo "Stack splitting works best with 3+ commits"
  exit 0
fi
```

### Uncommitted Changes

```bash
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: You have uncommitted changes"
  echo "Please commit or stash them before splitting"
  git status --short
  exit 1
fi
```

### Graphite Not Initialized

```bash
if ! gt status &>/dev/null; then
  echo "Error: Graphite (gt) is not initialized in this repository"
  echo "Run: gt init"
  exit 1
fi
```

## Integration with Nx

For Nx monorepos, the agent can use project structure for better grouping:

```typescript
// Get Nx project details for affected projects
const affectedProjects = await Bash('npx nx show projects --affected --base="$BASE_BRANCH"');

// Get project graph to understand dependencies
const projectGraph = await Task({
  subagent_type: 'general-purpose',
  prompt: 'Use mcp__nx-mcp__nx_project_details to get details about affected Nx projects',
});
```

This helps create splits that respect package boundaries and dependencies.

## Troubleshooting

### "Graphite (gt) is not initialized"

**Solution:** Run `gt repo init` in your repository root.

### "You have uncommitted changes"

**Solution:** Commit or stash your changes:

```bash
git stash                    # Temporarily stash changes
# OR
git commit -am "WIP"        # Commit work in progress
```

### "Invalid branch name"

**Solution:** Branch names must contain only letters, numbers, hyphens, underscores, slashes, and dots. Avoid special characters and shell metacharacters.

### "No commits found between branches"

**Solutions:**

- Verify you're on a feature branch (not main): `git branch --show-current`
- Check the base branch name is correct: `git branch -a`
- Ensure your branch has commits: `git log main..HEAD`

### "Branch does not exist"

**Solution:** Verify branch names with `git branch -a` and ensure you're using the correct branch name.

### "Split failed mid-operation"

**Recovery steps:**

1. Check current git state: `git status`
2. List active worktrees: `git worktree list`
3. Remove failed worktree: `git worktree remove <path>`
4. Reset to starting point: `git reset --hard origin/your-branch`

### Graphite CLI not found

**Solution:** Install Graphite CLI globally:

```bash
npm install -g @withgraphite/graphite-cli@latest
```

### Permission denied errors

**Solution:** Ensure you have write permissions to the repository and can push to the remote.

## Related Commands

- `/plan`: Create implementation plans for features
- `/create-pr`: Create individual PRs
- `/review-pr`: Review PRs in a stack

## Notes

This command is designed to work with your existing Graphite (gt) workflow and respects your preference for manual approval before making changes.
