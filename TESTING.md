# Testing Guide: Solo Labs AI Toolkit

This guide walks you through testing the Solo Labs AI Toolkit step-by-step, from setup to verification.

## Prerequisites

Before starting, ensure you have:
- **Node.js** 20.x or higher
- **Bun** package manager installed (`curl -fsSL https://bun.sh/install | bash`)
- **Git** for version control

## Step 1: Verify Dependencies and Build

### 1.1 Install Dependencies

From the repository root:

```bash
bun install
```

**Expected output:** Dependencies should install without errors. You should see packages from the Nx ecosystem and other dev dependencies.

**What to check:**
- ✅ `node_modules/` directory exists
- ✅ `bun.lock` is up to date
- ✅ No error messages about missing peer dependencies

### 1.2 Build All Packages

```bash
bun run build
```

**Expected output:** All packages should build successfully. This command runs `nx run-many --target=build --all`.

**What to check:**
- ✅ No TypeScript compilation errors
- ✅ Build artifacts appear in `packages/*/dist/` directories
- ✅ Index files are generated correctly

**Common issues:**
- If build fails, check that all packages have their `project.json` configured correctly
- Ensure TypeScript paths in `tsconfig.base.json` are valid

---

## Step 2: Inspect Package Structure

### 2.1 View Project Graph

```bash
npx nx graph
```

**Expected output:** Opens a browser window with an interactive dependency graph.

**What to check:**
- ✅ All 7 packages appear in the graph
- ✅ Dependencies between packages are correct (e.g., installer depends on agent/command packages)
- ✅ No circular dependencies

### 2.2 List Available Agents

```bash
ls -1 packages/agents/agnostic/src/*.md | wc -l
ls -1 packages/agents/frontend/src/*.md | wc -l
ls -1 packages/agents/subgraph/src/*.md | wc -l
```

**Expected output:**
- Agnostic agents: ~28 files
- Frontend agents: ~4 files
- Subgraph agents: ~2 files

### 2.3 List Available Commands

```bash
ls -1 packages/commands/agnostic/src/*.md | wc -l
ls -1 packages/commands/frontend/src/*.md | wc -l
```

**Expected output:**
- Agnostic commands: ~28 files
- Frontend commands: ~3 files

### 2.4 List Protocol Knowledge Docs

```bash
find packages/agents/protocol-knowledge/src -name "*.md" | wc -l
```

**Expected output:** ~15 markdown files across concepts, patterns, and gotchas directories.

---

## Step 3: Test Installer (Dry Run)

### 3.1 Test with --dry Flag

This shows what would be installed without actually writing files:

```bash
npx @solo-labs/ai-toolkit-nx-claude init --dry
```

**Expected output:**
- Summary of agents, commands, and knowledge docs to be installed
- Installation target path (should be `~/.claude` by default)
- No actual files written

**What to check:**
- ✅ Correct count of agents (34 total: 28 agnostic + 4 frontend + 2 subgraph)
- ✅ Correct count of commands (31 total: 28 agnostic + 3 frontend)
- ✅ Installation path is shown correctly
- ✅ No errors during package resolution

### 3.2 Test Custom Mode with Dry Run

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installMode=custom --dry
```

**Expected output:** Interactive prompts asking which categories to install (or simulation of them).

**What to check:**
- ✅ Prompts appear for selecting agent/command categories
- ✅ Can select individual categories
- ✅ Final summary reflects selections

---

## Step 4: Test Local Installation

### 4.1 Install to Local Directory

This installs to `./.claude` in the current repo (safe for testing):

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installMode=custom --installationType=local
```

**Expected output:**
- Files copied to `./.claude/` directory
- `manifest.json` created with metadata
- Success message with next steps

**What to check:**
- ✅ `.claude/` directory exists
- ✅ `.claude/agents/` contains agent markdown files
- ✅ `.claude/commands/` contains command markdown files
- ✅ `.claude/manifest.json` exists and is valid JSON

### 4.2 Verify Local Installation

```bash
ls -la .claude/
ls -1 .claude/agents/*.md | wc -l
ls -1 .claude/commands/*.md | wc -l
cat .claude/manifest.json | head -20
```

**Expected output:**
- Agent count matches what you selected
- Command count matches what you selected
- `manifest.json` contains installation metadata

---

## Step 5: Verify Installed Content

### 5.1 Check Agent Frontmatter

Pick a few agents and verify they have valid YAML frontmatter:

```bash
head -20 .claude/agents/explore-aegis.md
head -20 .claude/agents/debug-l-units.md
head -20 .claude/agents/gen-foundry-tests.md
```

**Expected output:**
- Each file starts with `---`
- Contains `name:` field
- Contains `description:` field
- Optional fields: `knowledge:`, `tools:`, etc.

**What to check:**
- ✅ YAML frontmatter is valid
- ✅ Names are descriptive
- ✅ Descriptions explain the agent's purpose

### 5.2 Check Command Frontmatter

```bash
head -20 .claude/commands/explore-aegis.md
head -20 .claude/commands/validate-invariants.md
```

**Expected output:**
- Each file starts with `---`
- Contains `description:` field
- Optional fields: `argument-hint:`, `agents:`, `allowed-tools:`

### 5.3 Verify Protocol Knowledge Embedding

Check that agents reference protocol knowledge correctly:

```bash
grep -r "knowledge:" .claude/agents/ | head -5
```

**Expected output:** Some agents should reference protocol knowledge documents.

---

## Step 6: Test Index Generators

The index generators create `src/index.ts` files that export agent/command metadata.

### 6.1 Generate Agent Indexes

```bash
nx run @solo-labs/agents-agnostic:generate-index
nx run @solo-labs/agents-frontend:generate-index
nx run @solo-labs/agents-subgraph:generate-index
```

**Expected output:**
- Index files regenerated in each package
- Success messages

**What to check:**
- ✅ `packages/agents/agnostic/src/index.ts` updated
- ✅ `packages/agents/frontend/src/index.ts` updated
- ✅ `packages/agents/subgraph/src/index.ts` updated

### 6.2 Generate Command Indexes

```bash
nx run @solo-labs/commands-agnostic:generate-index
nx run @solo-labs/commands-frontend:generate-index
```

**Expected output:**
- Index files regenerated
- Success messages

### 6.3 Verify Generated Indexes

```bash
head -30 packages/agents/agnostic/src/index.ts
head -30 packages/commands/agnostic/src/index.ts
```

**Expected output:**
- TypeScript exports for each agent/command
- Metadata includes name, description, content

---

## Step 7: Test Re-installation and --force

### 7.1 Test Re-install Without --force

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installationType=local
```

**Expected output:**
- Should detect existing installation
- Should NOT overwrite existing files
- Should show message about using `--force` to overwrite

### 7.2 Test Re-install With --force

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installationType=local --force
```

**Expected output:**
- Overwrites existing files
- Success message

---

## Step 8: Test Global Installation (Optional)

⚠️ **Warning:** This installs to `~/.claude` which affects your global Claude Code setup.

### 8.1 Backup Existing Config (if any)

```bash
if [ -d ~/.claude ]; then
  cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d_%H%M%S)
  echo "Backup created"
fi
```

### 8.2 Install Globally

```bash
npx @solo-labs/ai-toolkit-nx-claude init
```

**Expected output:**
- Files installed to `~/.claude/`
- Success message

### 8.3 Verify Global Installation

```bash
ls -la ~/.claude/
ls -1 ~/.claude/agents/*.md | wc -l
ls -1 ~/.claude/commands/*.md | wc -l
```

---

## Step 9: Test in Claude Code (Integration Test)

### 9.1 Start Claude Code

In a terminal with the AEGIS protocol repo (or any repo):

```bash
claude
```

### 9.2 Try a Command

In Claude Code, type:

```
/explore-aegis vault lifecycle
```

**Expected behavior:**
- Claude recognizes the `/explore-aegis` command
- Uses the specialized agent with AEGIS protocol knowledge
- Provides detailed explanation of vault lifecycle

### 9.3 Try Other Commands

```
/validate-invariants
/debug-l-units
/gen-foundry-tests
```

**Expected behavior:**
- Each command loads the appropriate agent
- Agent has access to protocol knowledge
- Responses are domain-specific and accurate

---

## Step 10: Test Content Addition Workflow

### 10.1 Add a New Agent

Create a test agent:

```bash
cat > packages/agents/agnostic/src/test-agent.md << 'EOF'
---
name: test-agent
description: A test agent for verification
---

# Test Agent

This is a test agent to verify the workflow.

## Instructions

Test instructions go here.
EOF
```

### 10.2 Regenerate Index

```bash
nx run @solo-labs/agents-agnostic:generate-index
```

### 10.3 Verify Agent in Index

```bash
grep -A 5 "test-agent" packages/agents/agnostic/src/index.ts
```

**Expected output:** The test agent should appear in the index with correct metadata.

### 10.4 Rebuild

```bash
bun run build
```

### 10.5 Reinstall

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installationType=local --force
```

### 10.6 Verify Test Agent Installed

```bash
ls -la .claude/agents/test-agent.md
```

### 10.7 Cleanup

```bash
rm packages/agents/agnostic/src/test-agent.md
nx run @solo-labs/agents-agnostic:generate-index
```

---

## Troubleshooting

### Build Fails

**Problem:** TypeScript compilation errors

**Solution:**
1. Check `tsconfig.base.json` paths are correct
2. Ensure all packages are listed in workspace
3. Run `bun install` again
4. Clear Nx cache: `nx reset`

### Installer Can't Find Packages

**Problem:** `Cannot find module '@solo-labs/agents-agnostic'`

**Solution:**
1. Run `bun run build` to ensure all packages are built
2. Check that `dist/` directories exist
3. Verify `package.json` exports are correct

### Commands Don't Appear in Claude Code

**Problem:** Commands not recognized after installation

**Solution:**
1. Restart Claude Code
2. Check that files exist in `~/.claude/commands/` (or `./.claude/commands/` for local)
3. Verify YAML frontmatter is valid
4. Check Claude Code logs for parsing errors

### Re-install Doesn't Update Files

**Problem:** Changes to agents/commands don't appear after reinstall

**Solution:**
1. Use `--force` flag: `npx @solo-labs/ai-toolkit-nx-claude init --force`
2. Manually delete target directory first
3. Ensure you rebuilt before reinstalling

---

## Success Criteria

✅ **All tests pass if:**

1. ✅ Dependencies install without errors
2. ✅ All packages build successfully
3. ✅ Project graph shows correct structure
4. ✅ Dry run shows correct counts (34 agents, 31 commands)
5. ✅ Local installation creates `.claude/` with correct content
6. ✅ Agents and commands have valid YAML frontmatter
7. ✅ Index generators work and produce valid TypeScript
8. ✅ Re-install respects existing files (without `--force`)
9. ✅ Re-install overwrites files (with `--force`)
10. ✅ Commands work in Claude Code (integration test)

---

## Next Steps

After successful testing:

1. **Document Issues:** Note any problems in GitHub issues
2. **Improve UX:** Based on testing, identify areas for better error messages or docs
3. **Test in Real Repos:** Try installation in actual AEGIS repos
4. **Gather Feedback:** Have other developers run through this guide

---

## Quick Reference

```bash
# Install and build
bun install
bun run build

# Dry run (preview)
npx @solo-labs/ai-toolkit-nx-claude init --dry

# Local install (safe for testing)
npx @solo-labs/ai-toolkit-nx-claude init --installationType=local

# Global install
npx @solo-labs/ai-toolkit-nx-claude init

# Force overwrite
npx @solo-labs/ai-toolkit-nx-claude init --force

# Generate indexes
nx run @solo-labs/agents-agnostic:generate-index
nx run @solo-labs/commands-agnostic:generate-index

# View graph
npx nx graph
```
