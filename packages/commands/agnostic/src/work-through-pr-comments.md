---
name: work-through-pr-comments
description: Methodically work through GitHub pull request comments in a conversational workflow, analyzing each comment, presenting solution options, gathering your decisions, and implementing approved changes.
argument-hint: <pr-number> OR <owner/repo> <pr-number>
allowed-tools: Bash(*), Read(*), Write(*), Edit(*), Grep(*), Glob(*), AskUserQuestion(*), mcp__github__get_pull_request(*), mcp__github__get_pull_request_comments(*), mcp__github__get_pull_request_reviews(*)
---

# Work Through PR Comments

Methodically work through GitHub pull request comments in a conversational workflow, analyzing each comment, presenting solution options, gathering your decisions, and implementing approved changes.

## Usage

```bash
/work-through-pr-comments <pr-number>           # Work through comments on PR in current repo
/work-through-pr-comments <owner/repo> <pr-number>  # Work through comments on PR in specific repo
```

## Examples

```bash
/work-through-pr-comments 154                    # Work through comments on PR #154 in current repo
/work-through-pr-comments labs-solo/aegis-engine 154 # Work through comments on PR #154 in labs-solo/aegis-engine
```

## Workflow Overview

This command implements a **conversational, methodical workflow** for addressing PR comments:

1. **Fetch PR Details**: Get PR information, reviews, and inline comments
2. **Analyze Each Comment**: For each comment, provide context and analysis
3. **Present Options**: Suggest multiple solution approaches with pros/cons
4. **Gather Decisions**: Ask you which approach to take
5. **Implement Changes**: Make the approved changes
6. **Verify**: Test and validate the changes
7. **Repeat**: Move to next comment until all are addressed
8. **Commit**: Offer to create a single commit with all changes

## Input Parameters

### Required

- **pr-number**: The pull request number (e.g., `154`)

### Optional

- **owner/repo**: Repository in format `owner/repo` (defaults to current repo detected from git remote)

## Step-by-Step Implementation

### Step 1: Parse Input and Detect Repository

```typescript
// Parse command arguments
const args = userInput.trim().split(/\s+/);

let owner: string;
let repo: string;
let prNumber: number;

if (args.length === 1) {
  // Format: /work-through-pr-comments 154
  // Detect from current git remote
  const remoteUrl = await Bash('git config --get remote.origin.url');
  // Parse owner/repo from: git@github.com:owner/repo.git or https://github.com/owner/repo.git
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error(
      'Could not detect repository from git remote. Use: /work-through-pr-comments <owner/repo> <pr-number>'
    );
  }
  [, owner, repo] = match;
  prNumber = parseInt(args[0]);
} else if (args.length === 2) {
  // Format: /work-through-pr-comments owner/repo 154
  [owner, repo] = args[0].split('/');
  prNumber = parseInt(args[1]);
} else {
  throw new Error(
    'Usage: /work-through-pr-comments <pr-number> OR /work-through-pr-comments <owner/repo> <pr-number>'
  );
}

// Validate PR number
if (isNaN(prNumber) || prNumber <= 0) {
  throw new Error(`Invalid PR number: ${args[args.length - 1]}`);
}

console.log(`Analyzing PR #${prNumber} in ${owner}/${repo}...`);
```

### Step 2: Fetch PR Data

Fetch all PR-related data in parallel for efficiency:

```typescript
// Fetch PR details, comments, and reviews in parallel
const [prDetails, prComments, prReviews] = await Promise.all([
  mcp__github__get_pull_request({ owner, repo, pull_number: prNumber }),
  mcp__github__get_pull_request_comments({ owner, repo, pull_number: prNumber }),
  mcp__github__get_pull_request_reviews({ owner, repo, pull_number: prNumber }),
]);

console.log(`\n**PR Title**: ${prDetails.title}`);
console.log(`**Author**: ${prDetails.user.login}`);
console.log(`**State**: ${prDetails.state}`);
console.log(`**URL**: ${prDetails.html_url}\n`);
```

### Step 3: Organize and Categorize Comments

Organize comments into categories for clear presentation:

```typescript
interface Comment {
  id: string;
  type: 'inline' | 'review';
  author: string;
  body: string;
  path?: string;
  line?: number;
  position?: number;
  created_at: string;
  html_url: string;
}

// Collect all comments
const allComments: Comment[] = [];

// Add inline comments (code review comments)
prComments.forEach((comment) => {
  allComments.push({
    id: `comment-${comment.id}`,
    type: 'inline',
    author: comment.user.login,
    body: comment.body,
    path: comment.path,
    line: comment.line,
    position: comment.position,
    created_at: comment.created_at,
    html_url: comment.html_url,
  });
});

// Add review comments (from review body)
prReviews.forEach((review) => {
  if (review.body && review.body.trim()) {
    allComments.push({
      id: `review-${review.id}`,
      type: 'review',
      author: review.user.login,
      body: review.body,
      created_at: review.submitted_at,
      html_url: review.html_url,
    });
  }
});

// Sort by creation date (oldest first)
allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

console.log(`Found ${allComments.length} comment(s) to address`);

if (allComments.length === 0) {
  console.log('No comments to address!');
  return;
}
```

### Step 4: Process Each Comment Conversationally

For each comment, follow the conversational workflow:

```typescript
// Track decisions and changes
const decisions = [];
const filesToChange = new Set<string>();

for (let i = 0; i < allComments.length; i++) {
  const comment = allComments[i];
  const commentNum = i + 1;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Comment ${commentNum}/${allComments.length}`);
  console.log(`${'='.repeat(80)}\n`);

  // Display comment context
  console.log(`**Author**: ${comment.author}`);
  console.log(
    `**Type**: ${comment.type === 'inline' ? 'Inline code comment' : 'General review comment'}`
  );
  if (comment.path) {
    console.log(`**Location**: \`${comment.path}:${comment.line || comment.position}\``);
  }
  console.log(`**Comment**:\n> ${comment.body}\n`);

  // Read affected file if inline comment
  let fileContext = null;
  if (comment.type === 'inline' && comment.path) {
    try {
      const fullPath = `${process.cwd()}/${comment.path}`;
      fileContext = await Read(fullPath);

      // Show relevant section around the comment line
      const lines = fileContext.split('\n');
      const targetLine = comment.line || comment.position || 0;
      const startLine = Math.max(0, targetLine - 5);
      const endLine = Math.min(lines.length, targetLine + 5);

      console.log(`**Current Code Context** (\`${comment.path}\`):\n`);
      console.log('```');
      for (let i = startLine; i < endLine; i++) {
        const lineNum = i + 1;
        const prefix = lineNum === targetLine ? '-> ' : '  ';
        console.log(`${prefix}${String(lineNum).padStart(4)} ${lines[i]}`);
      }
      console.log('```\n');

      filesToChange.add(fullPath);
    } catch (error) {
      console.log(`Warning: Could not read file: ${comment.path}\n`);
    }
  }

  // AI Analysis: Understand the comment and suggest solutions
  console.log('## My Analysis\n');

  // This is where Claude should analyze the comment based on its content
  // The actual analysis will be done by Claude in real-time
  // Key things to analyze:
  // - What is the reviewer asking for?
  // - Why are they asking for it?
  // - What are the implications?
  // - What are possible approaches?

  console.log('## Suggested Solutions\n');

  // Present options (Claude should generate these based on the comment)
  // Example structure:
  console.log('**Option A**: [First approach]');
  console.log('- Pros: ...');
  console.log('- Cons: ...\n');

  console.log('**Option B**: [Second approach]');
  console.log('- Pros: ...');
  console.log('- Cons: ...\n');

  console.log('**My Recommendation**: [Preferred option and reasoning]\n');

  // Ask user for decision using AskUserQuestion
  const userChoice = await AskUserQuestion({
    questions: [
      {
        question: `How would you like to address this comment from ${comment.author}?`,
        header: 'Approach',
        multiSelect: false,
        options: [
          {
            label: 'Option A',
            description: 'Implement the first suggested approach',
          },
          {
            label: 'Option B',
            description: 'Implement the second suggested approach',
          },
          {
            label: 'Custom',
            description: "I'll tell you what I want to do",
          },
          {
            label: 'Skip',
            description: 'Skip this comment for now',
          },
        ],
      },
    ],
  });

  const selectedOption = userChoice.answers['Approach'];

  if (selectedOption === 'Skip') {
    console.log('Skipping this comment\n');
    decisions.push({
      comment: commentNum,
      author: comment.author,
      decision: 'skipped',
      reason: 'User chose to skip',
    });
    continue;
  }

  if (selectedOption === 'Custom') {
    console.log(
      "Please describe what you'd like me to do for this comment, and I'll implement it.\n"
    );
    // Wait for user to provide instructions
    // Then implement based on their guidance
    continue;
  }

  // Implement the chosen solution
  console.log(`\n## Implementing: ${selectedOption}\n`);

  // Make the necessary changes based on the chosen option
  // This will vary depending on the comment, but generally:
  // 1. Use Read tool to get current file content (if not already read)
  // 2. Use Edit tool to make changes
  // 3. Verify changes
  // 4. Track changed files

  decisions.push({
    comment: commentNum,
    author: comment.author,
    decision: selectedOption,
    files_changed: Array.from(filesToChange),
  });

  console.log('Changes implemented\n');
}
```

### Step 5: Summary and Commit

After processing all comments, provide a summary and offer to commit:

```typescript
console.log(`\n${'='.repeat(80)}`);
console.log('Summary of Changes');
console.log(`${'='.repeat(80)}\n`);

const addressedCount = decisions.filter((d) => d.decision !== 'skipped').length;
const skippedCount = decisions.filter((d) => d.decision === 'skipped').length;

console.log(`Total comments processed: ${allComments.length}`);
console.log(`Comments addressed: ${addressedCount}`);
console.log(`Comments skipped: ${skippedCount}`);
console.log(`Files modified: ${filesToChange.size}\n`);

// List all changed files
if (filesToChange.size > 0) {
  console.log('**Files changed:**');
  filesToChange.forEach((file) => {
    console.log(`  - ${file}`);
  });
  console.log('');
}

// Run formatting and linting
console.log('Running code quality checks...\n');

try {
  // Format code
  await Bash('npx nx format:write --uncommitted');
  console.log('Code formatting complete');

  // Lint markdown if any .md files changed
  const hasMarkdownChanges = Array.from(filesToChange).some((f) => f.endsWith('.md'));
  if (hasMarkdownChanges) {
    await Bash('npm exec markdownlint-cli2 -- --fix "**/*.md"');
    console.log('Markdown linting complete');
  }
} catch (error) {
  console.log(`Warning: Some quality checks failed: ${error.message}`);
  console.log('Continuing...\n');
}

// Show git status
const gitStatus = await Bash('git status --short');
console.log('\n**Git status:**');
console.log('```');
console.log(gitStatus);
console.log('```\n');

// Ask if user wants to commit
const shouldCommit = await AskUserQuestion({
  questions: [
    {
      question: 'Would you like to commit these changes?',
      header: 'Commit',
      multiSelect: false,
      options: [
        {
          label: 'Yes',
          description: 'Stage all changes and create a commit',
        },
        {
          label: 'No',
          description: 'Leave changes unstaged for manual review',
        },
      ],
    },
  ],
});

if (shouldCommit.answers['Commit'] === 'Yes') {
  // Stage all changes
  await Bash('git add -A');

  // Create commit message
  const commitMessage = `fix: address PR #${prNumber} review comments

Addressed ${addressedCount} review comment(s) from ${
    new Set(decisions.map((d) => d.author)).size
  } reviewer(s)
Modified ${filesToChange.size} file(s)

PR: ${prDetails.html_url}`;

  // Create commit using heredoc for proper formatting
  await Bash(`git commit -m "$(cat <<'EOF'
${commitMessage}
EOF
)"`);

  console.log('Changes committed successfully!');

  // Show the commit
  await Bash('git log -1 --oneline');
} else {
  console.log('Changes left unstaged. Review and commit when ready.');
}
```

## Workflow Principles

### 1. Conversational Approach

- **One comment at a time**: Don't overwhelm with all comments at once
- **Clear context**: Always show the comment, location, and relevant code
- **Ask questions**: Use AskUserQuestion tool to gather user preferences
- **Wait for decisions**: Never assume what the user wants
- **Support custom responses**: Allow user to provide their own solution

### 2. Methodical Analysis

For each comment:

1. **Understand Intent**: What is the reviewer asking for?
2. **Identify Impact**: What files/code needs to change?
3. **Assess Complexity**: Is this simple or complex?
4. **Consider Tradeoffs**: What are the pros/cons of different approaches?
5. **Provide Recommendation**: Share your preferred option with reasoning

### 3. Present Options

Always provide **2-3 options** with:

- Clear, concise description
- Pros and cons for each
- Your recommendation (with reasoning)
- "Custom" option for user-provided solutions
- "Skip" option for comments the user wants to defer

### 4. Implement Cleanly

- Read files before editing (required by Edit tool)
- Make targeted changes (don't refactor unrelated code)
- Verify changes work (run linting, type checking if applicable)
- Track all modified files for the summary
- Show progress and results after each implementation

### 5. Quality Checks

Before offering to commit:

- Run code formatting (`npx nx format:write --uncommitted`)
- Run markdown linting (if .md files changed)
- Run affected linting (if applicable)
- Show git status for user review
- Handle errors gracefully

### 6. Single Commit

Create one well-formatted commit for all PR comment changes:

- Clear commit message following conventional commits
- Summarize what was addressed
- Include PR URL for reference
- List number of comments addressed and files changed

## Error Handling

### No Comments Found

```typescript
if (allComments.length === 0) {
  console.log('No comments to address! This PR has no review comments.');
  return;
}
```

### Invalid PR Number

```typescript
try {
  const prDetails = await mcp__github__get_pull_request({ owner, repo, pull_number: prNumber });
} catch (error) {
  console.log(`Could not find PR #${prNumber} in ${owner}/${repo}`);
  console.log(`Error: ${error.message}`);
  console.log('\nPlease verify:');
  console.log('  - The PR number is correct');
  console.log('  - You have access to this repository');
  console.log('  - The repository name is correct');
  return;
}
```

### File Read Failures

```typescript
try {
  const fullPath = `${process.cwd()}/${comment.path}`;
  fileContext = await Read(fullPath);
} catch (error) {
  console.log(`Warning: Could not read file: ${comment.path}`);
  console.log('Proceeding without file context...\n');
  // Continue - we can still analyze the comment without file context
}
```

### Git Operation Failures

```typescript
try {
  await Bash('git add -A');
  await Bash(`git commit -m "${commitMessage}"`);
  console.log('Changes committed successfully!');
} catch (error) {
  console.log('Failed to create commit');
  console.log(`Error: ${error.message}`);
  console.log('\nYour changes have been made but not committed.');
  console.log('Please review the changes and commit manually with:');
  console.log('  git add -A');
  console.log('  git commit -m "fix: address PR review comments"');
}
```

### Repository Detection Failures

```typescript
try {
  const remoteUrl = await Bash('git config --get remote.origin.url');
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) throw new Error('Invalid GitHub URL format');
  [, owner, repo] = match;
} catch (error) {
  console.log('Could not detect repository from git remote');
  console.log('Please specify repository explicitly:');
  console.log('  /work-through-pr-comments <owner/repo> <pr-number>');
  console.log('\nExample:');
  console.log('  /work-through-pr-comments labs-solo/aegis-engine 154');
  return;
}
```

## Best Practices

### 1. Always Read Files Before Editing

The Edit tool requires files to be read first:

```typescript
// Correct
const content = await Read(filePath);
await Edit({ file_path: filePath, old_string: '...', new_string: '...' });

// Wrong - will fail with error
await Edit({ file_path: filePath, old_string: '...', new_string: '...' });
```

### 2. Track All Modified Files

Maintain a Set to avoid duplicates:

```typescript
const filesToChange = new Set<string>();

// After each file modification
filesToChange.add(fullPath);

// Later, get count and list
console.log(`Modified ${filesToChange.size} file(s)`);
filesToChange.forEach((file) => console.log(`  - ${file}`));
```

### 3. Show Progress Clearly

Use clear visual separators and progress indicators:

```typescript
console.log(`\n${'='.repeat(80)}`);
console.log(`Comment ${commentNum}/${allComments.length}`);
console.log(`${'='.repeat(80)}\n`);

// After implementation
console.log('Changes implemented\n');
```

### 4. Provide Rich Context

Show the code being discussed:

```typescript
// Highlight the specific line mentioned in the comment
for (let i = startLine; i < endLine; i++) {
  const lineNum = i + 1;
  const prefix = lineNum === targetLine ? '-> ' : '  ';
  console.log(`${prefix}${String(lineNum).padStart(4)} ${lines[i]}`);
}
```

### 5. Handle User's Custom Solutions

Be ready to implement what the user describes:

```typescript
if (selectedOption === 'Custom') {
  console.log("Please describe what you'd like me to do for this comment.\n");
  // Wait for user instructions in next message
  // Then implement exactly what they ask for
  continue; // Will resume after user provides guidance
}
```

### 6. Create Well-Formatted Commits

Use heredoc for multi-line commit messages:

```typescript
const commitMessage = `fix: address PR #${prNumber} review comments

Addressed ${addressedCount} review comment(s)
Modified ${filesToChange.size} file(s)

PR: ${prDetails.html_url}`;

await Bash(`git commit -m "$(cat <<'EOF'
${commitMessage}
EOF
)"`);
```

## Notes

- This command emphasizes **conversation and collaboration**
- Always wait for user decisions before making changes
- Provide clear, honest analysis with pros/cons
- Support user's custom solutions
- Track all changes for comprehensive summary
- Run quality checks before offering to commit
- Create a single, well-formatted commit
- Handle errors gracefully and provide helpful guidance
- The "Custom" option lets users direct you specifically
- The "Skip" option allows deferring comments without blocking progress
