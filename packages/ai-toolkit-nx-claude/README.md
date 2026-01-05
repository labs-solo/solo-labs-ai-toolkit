# @solo-labs/ai-toolkit-nx-claude

One-command installer for Solo Labs AI toolkit components for Claude Code.

## Overview

This Nx generator package enables one-shot setup of Solo Labs agents and
commands for Claude Code. It transforms the Solo Labs AI toolkit from "files in
a repo" to an "installable package" that can be deployed with a single command.

## Installation

### Via Nx (Recommended)

From within the Solo Labs monorepo:

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init
```

### Via npm (Standalone CLI)

```bash
# Using npx (not published yet)
npx @solo-labs/ai-toolkit-nx-claude init

# Or using the built CLI directly
node packages/ai-toolkit-nx-claude/dist/cli-generator.cjs init
```

## Usage

### Default Mode (Recommended)

The default mode installs a curated set of recommended components for Solo Labs workflows:

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init
```

This installs:

- **9 Commands**: explore, explore-aegis, plan, review-plan, execute-plan,
  validate-invariants, debug-l-units, debug-collateral, gen-foundry-tests
- **8 Agents**: aegis-architect, l-unit-accountant, context-loader, planner,
  plan-reviewer, foundry-test-writer, security-analyzer, code-explainer

### Custom Mode

For full control over what gets installed:

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init --installMode=custom
```

This will prompt you to:

1. Choose installation location (global or local)
2. Select which commands to install (all or specific)
3. Select which agents to install (all or specific)

### Non-Interactive Mode

For CI/CD or scripted installations:

```bash
# Install all components to global location
nx generate @solo-labs/ai-toolkit-nx-claude:init \
  --installMode=custom \
  --installationType=global \
  --commandSelectionMode=all \
  --agentSelectionMode=all \
  --nonInteractive

# Install specific components locally
nx generate @solo-labs/ai-toolkit-nx-claude:init \
  --installMode=custom \
  --installationType=local \
  --commands=explore,explore-aegis,plan \
  --agents=aegis-architect,planner \
  --nonInteractive
```

### Dry Run

Preview what would be installed without making changes:

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init --dry
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--installMode` | `default\|custom` | `default` | Installation mode |
| `--installationType` | `global\|local` | `global` | Install location |
| `--installCommands` | `boolean` | `true` | Install commands |
| `--installAgents` | `boolean` | `true` | Install agents |
| `--commandSelectionMode` | `all\|specific` | - | Command selection mode |
| `--agentSelectionMode` | `all\|specific` | - | Agent selection mode |
| `--commands` | `array` | - | Specific commands to install |
| `--agents` | `array` | - | Specific agents to install |
| `--dry` | `boolean` | `false` | Preview without making changes |
| `--force` | `boolean` | `false` | Overwrite existing files |
| `--nonInteractive` | `boolean` | `false` | Run without prompts |

## Installation Locations

### Global Installation

Components are installed to `~/.claude/` and available to Claude Code in
**all projects**.

### Local Installation

Components are installed to `./.claude/` and available **only in the current
project**.

## Available Components

### Commands (33 total)

General-purpose commands:

- `explore` - General codebase exploration
- `plan` - Create implementation plans
- `review-plan` - Review implementation plans
- `execute-plan` - Execute implementation plans
- `fix-bug` - Fix bugs with structured approach
- `gen-tests` - Generate tests
- `gen-commit-message` - Generate conventional commit messages
- `review-code` - Review code for quality and best practices
- `refactor` - Refactor code
- `research` - Research topics
- `explain-file` - Explain file contents
- `create-pr` - Create pull requests
- `review-pr` - Review pull requests
- `address-pr-issues` - Address PR review comments
- `work-through-pr-comments` - Systematically work through PR comments
- `split-stack` - Split monolithic branches into logical PR stacks
- `perf-analyze` - Analyze performance
- `monitor` - Monitor systems
- `deploy` - Deploy applications
- `implement-spec` - Implement from specifications
- `auto-spec` - Auto-generate specifications

AEGIS protocol-specific commands:

- `explore-aegis` - Deep dive into AEGIS protocol architecture
- `validate-invariants` - Validate AEGIS protocol invariants
- `debug-l-units` - Debug L-unit calculations
- `debug-collateral` - Debug collateral management
- `gen-foundry-tests` - Generate Foundry tests for AEGIS
- `review-keeper-flow` - Review keeper settlement flows
- `analyze-session` - Analyze AEGIS session lifecycle
- `analyze-vault-flow` - Analyze vault state transitions

Frontend-specific commands:

- `explore-redux` - Explore Redux state management
- `gen-component` - Generate React components

Subgraph-specific commands:

- `gen-subgraph-handler` - Generate subgraph event handlers
- `gen-matchstick-tests` - Generate Matchstick tests

### Agents (34 total)

Core agents:

- `context-loader` - Advanced context management
- `planner` - Implementation planning
- `plan-reviewer` - Plan review and validation
- `code-explainer` - Code explanation and analysis
- `code-generator` - Code generation
- `security-analyzer` - Security analysis
- `test-writer` - Test generation
- `test-runner` - Test execution
- `foundry-test-writer` - Foundry test generation
- `refactorer` - Code refactoring
- `researcher` - Research and documentation
- `doc-writer` - Documentation generation
- `commit-message-generator` - Commit message generation
- `pr-creator` - Pull request creation
- `pr-reviewer` - Pull request review
- `debug-assistant` - Debugging assistance
- `performance-analyzer` - Performance analysis
- `style-enforcer` - Code style enforcement
- `migration-assistant` - Migration guidance

Meta agents:

- `agent-capability-analyst` - Agent capability analysis
- `agent-optimizer` - Agent optimization
- `agent-orchestrator` - Multi-agent orchestration
- `prompt-engineer` - Prompt optimization

Infrastructure agents:

- `infrastructure-agent` - Infrastructure automation
- `cicd-agent` - CI/CD pipeline management
- `stack-splitter` - PR stack splitting

AEGIS protocol-specific agents:

- `aegis-architect` - AEGIS protocol architecture specialist
- `l-unit-accountant` - L-unit calculation specialist

Frontend-specific agents:

- `redux-architect` - Redux architecture specialist
- `vault-ui-builder` - Vault UI component builder
- `web3-integrator` - Web3 integration specialist
- `graphql-expert` - GraphQL schema and query specialist

Subgraph-specific agents:

- `assemblyscript-expert` - AssemblyScript specialist
- `subgraph-developer` - Subgraph development specialist

## Manifest Tracking

After installation, a `manifest.json` file is created in the installation directory:

```json
{
  "version": "1.0.0",
  "installedAt": "2026-01-05T21:19:20.743Z",
  "commands": ["explore", "plan", ...],
  "agents": ["planner", "aegis-architect", ...],
  "files": ["commands/explore.md", "agents/planner.md", ...]
}
```

## Architecture

### Dynamic Content Loading

The generator dynamically loads available commands and agents from the
filesystem, supporting two resolution strategies:

1. **Bundled content** (for standalone package distribution)
2. **Workspace content** (for monorepo development)

### Content Discovery

Commands and agents are discovered by:

1. Scanning `packages/commands/*/src/*.md` and `packages/agents/*/src/*.md`
2. Extracting YAML frontmatter for descriptions
3. Building a registry of available components

### File Installation

The generator:

1. Reads markdown files from source locations
2. Preserves YAML frontmatter and content
3. Writes to target directory (global or local)
4. Creates manifest.json for tracking

## Development

### Building

```bash
nx run @solo-labs/ai-toolkit-nx-claude:build
```

This runs:

1. `bundle` - Bundles TypeScript with esbuild
2. `generate-types` - Generates TypeScript declarations
3. `postbuild` - Copies markdown content to `dist/content/`

### Testing

```bash
# Test with dry run
nx generate @solo-labs/ai-toolkit-nx-claude:init --dry

# Test with different modes
nx generate @solo-labs/ai-toolkit-nx-claude:init --installMode=custom --dry

# Test CLI directly
node packages/ai-toolkit-nx-claude/dist/cli-generator.cjs --help
```

## Examples

### Install default setup globally

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init
```

### Install all components locally with dry run

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init \
  --installMode=custom \
  --installationType=local \
  --commandSelectionMode=all \
  --agentSelectionMode=all \
  --dry
```

### Install only AEGIS-specific components

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init \
  --installMode=custom \
  --commands=explore-aegis,validate-invariants,debug-l-units \
  --agents=aegis-architect,l-unit-accountant \
  --nonInteractive
```

## License

MIT
