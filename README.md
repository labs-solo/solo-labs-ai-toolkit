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

## What’s In This Repo

This is an Nx monorepo with content packages (Markdown) and an installer:

- `packages/agents/agnostic/` — core engineering + AEGIS protocol agents (28)
- `packages/commands/agnostic/` — core workflows + AEGIS protocol commands (28)
- `packages/agents/frontend/` — frontend agents (4)
- `packages/commands/frontend/` — frontend commands (3)
- `packages/agents/subgraph/` — subgraph agents (2)
- `packages/agents/protocol-knowledge/` — AEGIS reference docs (15) used as embedded knowledge
- `packages/ai-toolkit-nx-claude/` — installer (Nx generator + standalone CLI)

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

## Repo Development

```bash
bun install
bun run build
```

More details and internal notes live in `CLAUDE.md`.
