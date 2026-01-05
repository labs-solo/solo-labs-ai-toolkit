# Solo Labs AI Toolkit

Domain-focused Claude Code agents and slash commands for building the AEGIS protocol (Uniswap v4), plus a one-command installer.

## Quick Start

### Install globally (recommended)

Installs into `~/.claude` so the commands/agents are available in any repo.

```bash
npx @solo-labs/ai-toolkit-nx-claude init
```

### Preview / customize (safe first run)

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installMode=custom --dry
```

### Install locally (this repo only)

Installs into `./.claude` in your current repo.

```bash
npx @solo-labs/ai-toolkit-nx-claude init --installMode=custom --installationType=local
```

## What Gets Installed

The installer copies Markdown files into your Claude config directory:

```text
.claude/
  agents/<agent>.md
  commands/<command>.md
  manifest.json
```

Safety model:

- Re-running `init` does not overwrite existing files unless you pass `--force`.
- `--dry` shows what would be installed without writing anything.

## Uninstalling

To completely remove the toolkit:

```bash
# Global installation
rm -rf ~/.claude/agents ~/.claude/commands ~/.claude/manifest.json

# Local installation (from project root)
rm -rf ./.claude/agents ./.claude/commands ./.claude/manifest.json
```

To remove only specific components, delete individual files from `agents/` or `commands/` and update `manifest.json` accordingly.

> **Note:** An `uninstall` command is planned for a future release.

## What's In This Repo

This is an Nx monorepo with content packages (Markdown) and an installer:

- `packages/agents/agnostic/` — core engineering + AEGIS protocol agents (28)
- `packages/commands/agnostic/` — core workflows + AEGIS protocol commands (28)
- `packages/agents/frontend/` — frontend agents (4)
- `packages/commands/frontend/` — frontend commands (3)
- `packages/agents/subgraph/` — subgraph agents (2)
- `packages/agents/protocol-knowledge/` — AEGIS reference docs (15) used as embedded knowledge
- `packages/ai-toolkit-nx-claude/` — installer (Nx generator + standalone CLI)

## Start Here (Essential Commands)

New to the toolkit? Start with these 5 commands:

| Command | When to Use |
|---------|-------------|
| `/explore <area>` | Understand any part of the codebase before making changes |
| `/plan <task>` | Create a step-by-step implementation plan for any feature or fix |
| `/validate-invariants` | Check your changes against AEGIS safety rules |
| `/gen-foundry-tests` | Generate comprehensive Foundry tests for your contracts |
| `/review-pr` | Get AI review of a pull request before merging |

Once comfortable, explore the full command list below.

## Recommended Daily Workflows

Examples (run inside Claude Code):

- `/explore-aegis <area>`: understand a protocol surface area with AEGIS-specific framing.
- `/plan <task>` → `/review-plan` → `/execute-plan`: turn a request into a safe step-by-step implementation.
- `/validate-invariants`: check changes against AEGIS safety rules and invariants.
- `/debug-l-units`: trace L-unit accounting flows and spot equity-neutrality/precision issues.
- `/gen-foundry-tests`: generate Foundry tests (unit/fuzz/invariant/integration) with AEGIS invariants in mind.

Frontend-specific:

- `/analyze-vault-flow`: trace a vault UX flow from UI → state → contract calls.
- `/gen-component`: generate AEGIS-specific React components with proper L-unit display.

## Contributing (Fast Path)

### Add an agent

1. Create a Markdown file under one of:
   - `packages/agents/agnostic/src/<name>.md`
   - `packages/agents/frontend/src/<name>.md`
   - `packages/agents/subgraph/src/<name>.md`
2. Include YAML frontmatter with at least `name` and `description`.
3. Regenerate the index for that package:
   - `nx run @solo-labs/agents-agnostic:generate-index`
   - `nx run @solo-labs/agents-frontend:generate-index`
   - `nx run @solo-labs/agents-subgraph:generate-index`

### Add a command

1. Create `packages/commands/agnostic/src/<name>.md` or `packages/commands/frontend/src/<name>.md`
2. Include YAML frontmatter with at least `description` (command name is the filename).
3. Regenerate the index:
   - `nx run @solo-labs/commands-agnostic:generate-index`
   - `nx run @solo-labs/commands-frontend:generate-index`

### Add protocol knowledge

1. Add a doc under `packages/agents/protocol-knowledge/src/{concepts,patterns,gotchas}/`
2. Export it from `packages/agents/protocol-knowledge/src/index.ts`

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing instructions.

### Quick Test Commands

```bash
# Install and build
bun install
bun run build

# Test installer (dry run - safe)
node packages/ai-toolkit-nx-claude/dist/cli-generator.cjs init --dry

# Test local installation (non-interactive)
node packages/ai-toolkit-nx-claude/dist/cli-generator.cjs init \
  --installationType=local \
  --installMode=default \
  --nonInteractive

# Verify installation
ls -la .claude/
ls -1 .claude/agents/*.md | wc -l  # Should show 8-34 agents
ls -1 .claude/commands/*.md | wc -l  # Should show 9-33 commands

# Test index generators
npx nx run @solo-labs/agents-agnostic:generate-index
npx nx run @solo-labs/commands-agnostic:generate-index
```

## Repo Development

```bash
bun install
bun run build
```

More details and internal notes live in [CLAUDE.md](./CLAUDE.md).

## Troubleshooting

**Installation Issues:**

- **"Command not found" after install** — Ensure `~/.claude` exists and Claude Code is configured to read from it. Try restarting Claude Code.
- **Partial installation** — Safe to re-run `init`; existing files are preserved. Use `--force` to overwrite stale files.

**Recovery:**

- **Reset to clean state** — Delete `~/.claude/{agents,commands,manifest.json}` and re-run init.
- **Conflicts with existing setup** — Use `--installationType=local` to install per-project instead of globally.

**Common Errors:**

- **"Agent/command file not found"** — Re-run the init command to reinstall missing files.
- **Build failures** — Run `bun install && bun run build` from the repo root. Ensure Node.js 20+ is installed.
