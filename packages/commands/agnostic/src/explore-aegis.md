---
description: Deep dive into AEGIS protocol architecture with domain-specific analysis
argument-hint: <topic> [--repo aegis-engine|aegis-app|subgraph] [--depth overview|deep]
allowed-tools: Read(*), Grep(*), Glob(*), Task(subagent_type:aegis-architect), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- **topic**: Area to explore (e.g., "vault-lifecycle", "session-flow", "l-units", "collateral", "keeper", "hooks")
- **--repo**: Optional repository context (aegis-engine, aegis-app, aegis-engine-subgraph)
- **--depth**: Overview (high-level) or deep (detailed trace)

Examples:

- `/explore-aegis vault-lifecycle`
- `/explore-aegis l-units --depth deep`
- `/explore-aegis session-flow --repo aegis-engine`
- `/explore-aegis hooks`

## Task

Perform a domain-aware exploration of the AEGIS protocol:

1. **Identify topic area** and map to relevant contracts/libraries
2. **Load spec documents** from `docs/specs/` if available
3. **Analyze code patterns** specific to the topic
4. **Explain architecture** using AEGIS domain concepts
5. **Highlight invariants** and gotchas for the area

## Topic Mapping

| Topic | Key Files | Spec References |
|-------|-----------|-----------------|
| vault-lifecycle | `AegisEngine.sol`, `VaultLib.sol` | 0400-Behavioral-Flows.md |
| session-flow | `SessionLib.sol`, transient storage | 0400-Behavioral-Flows.md |
| l-units | `LMath.sol`, `MarketLib.sol` | 0009-L-unit-ledger.md |
| collateral | `CollateralLib.sol`, sqrt(K) | 0008-static-invariant.md |
| keeper | `KeeperLib.sol`, peel/liquidation | 0410-Keepers-Peel-and-MicroLiq.md |
| hooks | `AegisHook.sol`, V4 integration | 0100-Architecture-Overview.md |

## Delegation

### For Overview Depth

Invoke **aegis-architect** with:

- `topic`: parsed topic
- `scope`: high-level explanation
- `context`: repository context if specified

### For Deep Depth

1. First invoke **context-loader** with:
   - `topic`: parsed topic
   - `mode`: analyze
   - `focus`: specific aspect of the topic

2. Then invoke **aegis-architect** with:
   - `topic`: parsed topic
   - `scope`: detailed analysis
   - `context`: context_findings from context-loader

## Output Format

```yaml
topic: [analyzed topic]
repository: [target repository]
depth: [overview|deep]

overview:
  summary: |
    [2-3 paragraph explanation of the topic area]
  key_concepts:
    - concept: [name]
      description: [what it is]
      location: [where in code]

architecture:
  components:
    - name: [component]
      file: [file path]
      purpose: [what it does]
  data_flow: |
    [ASCII diagram or description of how data moves]

invariants:
  - name: [invariant name]
    description: [what must always be true]
    enforcement: [where/how it's enforced]

gotchas:
  - issue: [potential problem]
    why: [why it matters]
    mitigation: [how to handle]

spec_references:
  - file: [spec path]
    section: [relevant section]
    relevance: [why this is useful]

code_references:
  - file: [code path]
    lines: [line range]
    description: [what this code does]
```

## Examples

### Example 1: Vault Lifecycle

```bash
/explore-aegis vault-lifecycle
```

Output explains:

- How vaults are created (ERC-721 minting)
- Vault states and transitions
- Session locking/unlocking
- NFT attachment patterns

### Example 2: L-Unit Accounting (Deep)

```bash
/explore-aegis l-units --depth deep
```

Output includes:

- Full L-unit math trace
- Equity neutrality enforcement
- Share price calculations
- PIPS precision handling

### Example 3: Session Flow

```bash
/explore-aegis session-flow --repo aegis-engine
```

Output covers:

- EIP-1153 transient storage usage
- Session start/end lifecycle
- VaultSessionTracker patterns
- Phase-0 vs Phase-1 execution
