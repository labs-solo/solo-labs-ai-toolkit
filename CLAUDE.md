# Solo Labs AI Toolkit

## Overview

This is the Solo Labs AI Toolkit - a comprehensive developer tooling package for the AEGIS protocol built on Uniswap V4. It provides one-command Claude Code setup with domain-expert AI agents and slash commands specialized for DeFi protocol development.

## Quick Start

```bash
# Install globally (recommended)
npx @solo-labs/ai-toolkit-nx-claude init

# Preview / customize (safe first run)
npx @solo-labs/ai-toolkit-nx-claude init --installMode=custom --dry

# From this repo (Nx generator)
bun run claude:init
```

## Package Structure

```
solo-labs-ai-toolkit/
├── packages/
│   ├── agents/
│   │   ├── agnostic/               # Core agents (28)
│   │   ├── frontend/               # Frontend agents (4)
│   │   ├── subgraph/               # Subgraph agents (2)
│   │   └── protocol-knowledge/     # Embedded AEGIS docs (15)
│   ├── commands/
│   │   ├── agnostic/               # Core commands (28)
│   │   ├── frontend/               # Frontend commands (3)
│   │   └── subgraph/               # Subgraph commands (placeholder)
│   ├── ai-toolkit-nx-claude/       # Installer (Nx generator + CLI)
│   └── utils/                      # Shared utilities
├── nx.json
├── package.json
└── CLAUDE.md
```

## Content Overview

### Agents (34 total)

- `packages/agents/agnostic/` (28): planning, testing, security, protocol specialists (AEGIS + general workflows)
- `packages/agents/frontend/` (4): AEGIS UI/state/web3 integration specialists
- `packages/agents/subgraph/` (2): The Graph + AssemblyScript specialists

### Commands (31 total)

- `packages/commands/agnostic/` (28): explore/plan/review/execute, invariant checks, PR workflows, protocol debugging
- `packages/commands/frontend/` (3): vault UI flow tracing and component scaffolding

Tip: names + descriptions are generated into each package’s `src/index.ts` from YAML frontmatter.

## Protocol Knowledge (15 documents)

### Concepts (6)

| Document | Topic |
|----------|-------|
| `l-units.md` | Liquidity unit accounting |
| `sqrt-k-floor.md` | Collateral requirements |
| `two-phase-execution.md` | PM locked vs unlocked |
| `transient-storage.md` | EIP-1153 patterns |
| `pips.md` | Parts per million precision |
| `v4-hooks.md` | Uniswap V4 hook integration |

### Patterns (5)

| Document | Topic |
|----------|-------|
| `vault-operations.md` | Core vault flows |
| `keeper-flows.md` | Peel and liquidation |
| `collateral-management.md` | SAFE multi-NFT algorithm |
| `fee-accrual.md` | Protocol revenue distribution |
| `session-lifecycle.md` | Execution context management |

### Gotchas (4)

| Document | Topic |
|----------|-------|
| `equity-neutrality.md` | Common violations |
| `precision-errors.md` | PIPS/WAD rounding |
| `reentrancy-risks.md` | Callback safety |
| `assemblyscript-quirks.md` | The Graph development |

## AEGIS Protocol Concepts

### Key Domain Terms

| Concept | Description |
|---------|-------------|
| **L-units** | Uniswap liquidity units for equity-neutral operations |
| **sqrt(K) floor** | Static collateral using SAFE multi-NFT algorithm |
| **Two-phase execution** | Phase-0 (PM locked) vs Phase-1 (PM unlocked) |
| **PIPS** | Parts per million (1e6 denominator) for percentages |
| **Transient storage** | EIP-1153 for session-scoped state |
| **sL shares** | ERC-6909 tokens representing lender equity |
| **Vaults** | ERC-721 NFTs representing user positions |

### Critical Invariants

1. **Equity neutrality**: Borrow/repay don't change equityLWad
2. **Share price monotone**: Share price never decreases
3. **Session cleanup**: No pending state after session ends
4. **Collateral floor**: sqrt(K) requirement always enforced
5. **Utilization cap**: Cannot exceed 95% utilization

## Development

### Prerequisites

- Node.js 20+
- Bun (package manager)
- Nx CLI

### Build

```bash
# Install dependencies
bun install

# Build all packages
nx run-many --target=build --all

# Build specific package
nx run @solo-labs/agents-agnostic:build
```

### Add New Agent

1. Create `packages/agents/<scope>/src/<agent-name>.md` where `<scope>` is `agnostic`, `frontend`, or `subgraph`
2. Add YAML frontmatter with `name` and `description`
3. Run the appropriate index generator:
   - `nx run @solo-labs/agents-agnostic:generate-index`
   - `nx run @solo-labs/agents-frontend:generate-index`
   - `nx run @solo-labs/agents-subgraph:generate-index`

### Add New Command

1. Create `packages/commands/<scope>/src/<command-name>.md` where `<scope>` is `agnostic` or `frontend`
2. Add YAML frontmatter with at least `description` (optional: `argument-hint`, `agents`, `allowed-tools`)
3. Run the appropriate index generator:
   - `nx run @solo-labs/commands-agnostic:generate-index`
   - `nx run @solo-labs/commands-frontend:generate-index`

### Add Protocol Knowledge

1. Create document in appropriate category under `packages/agents/protocol-knowledge/src/`
2. Update `src/index.ts` to export the new document
3. Reference from agent frontmatter using `knowledge:` field

## Nx Workspace

This is an Nx monorepo. Key commands:

```bash
# View project graph
nx graph

# Run affected builds
nx affected --target=build

# Format code
nx format:write

# Generate agent index
nx run @solo-labs/agents-agnostic:generate-index
nx run @solo-labs/agents-frontend:generate-index
nx run @solo-labs/agents-subgraph:generate-index

# Generate command index
nx run @solo-labs/commands-agnostic:generate-index
nx run @solo-labs/commands-frontend:generate-index
```

## Related Repositories

| Repository | Purpose |
|------------|---------|
| `aegis-engine` | Core V2 protocol (Foundry) |
| `aegis-app` | V2 frontend (React/Vite) |
| `aegis-engine-subgraph` | The Graph indexer |
| `aegis-research` | Research sandbox |
| `AEGIS_DFM` | V1 dynamic fee mechanism |
| `AEGIS_DFF` | V1 Hardhat+Foundry hybrid |

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Foundation - Nx monorepo with @solo-labs scope |
| Phase 2 | ✅ Complete | Content packages - agents/commands across protocol + frontend + subgraph |
| Phase 3 | ✅ Complete | Protocol knowledge - 15 embedded documents |
| Phase 4 | ✅ Complete | Installer - `@solo-labs/ai-toolkit-nx-claude` init generator + CLI |
| Next | Planned | Catalog, validation, uninstall/update UX polish |
