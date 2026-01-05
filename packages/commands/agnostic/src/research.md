---
description: Research a topic using web search, documentation, and codebase analysis
argument-hint: <topic> [--scope web|docs|code|all] [--depth quick|thorough]
allowed-tools: WebSearch(*), WebFetch(*), Read(*), Glob(*), Grep(*), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `topic`: Research topic or question (required)
- `--scope`: Research scope: `web` | `docs` | `code` | `all` (default: all)
- `--depth`: Research depth: `quick` | `thorough` (default: quick)
- `--output`: Output file path for research notes (optional)

Examples:

- `/research "EIP-4844 blob transactions"`
- `/research "how does Uniswap V4 handle flash loans" --scope docs`
- `/research "redux toolkit best practices 2024" --scope web`
- `/research "authentication patterns in this codebase" --scope code`
- `/research "L-unit accounting" --depth thorough --output notes/l-units.md`

## Task

Research a topic comprehensively by:

1. Searching relevant sources based on scope
2. Gathering and synthesizing information
3. Identifying key findings and insights
4. Providing actionable conclusions

## Research Scopes

### Web

- Search the internet for latest information
- Find official documentation and tutorials
- Locate relevant discussions and articles
- Check for recent updates and changes

### Docs

- Search project documentation
- Check README files and guides
- Look at inline documentation
- Find spec documents and RFCs

### Code

- Analyze codebase implementation
- Find usage examples
- Identify patterns and conventions
- Trace data flows

### All (default)

- Combines all scopes
- Cross-references findings
- Provides comprehensive view

## Process

1. **Parse Topic**: Understand what to research
2. **Select Sources**: Based on scope
3. **Gather Information**: Search and read sources
4. **Synthesize**: Combine findings coherently
5. **Conclude**: Provide actionable insights

## Source Handling

### Web Search

```
Use WebSearch to find:
- Official documentation
- Tutorial articles
- Stack Overflow answers
- GitHub discussions
- Blog posts and guides
```

### Documentation

```
Use Read and Glob to find:
- README.md files
- docs/ directory
- CLAUDE.md (project context)
- Inline JSDoc/NatSpec comments
```

### Code Analysis

```
Delegate to context-loader for:
- Implementation patterns
- Usage examples
- Related files
- Design decisions
```

## Output

```yaml
research_summary:
  topic: [research topic]
  scope: [scope used]
  depth: [depth used]
  confidence: high | medium | low

key_findings:
  - finding: [key insight]
    source: [where found]
    reliability: high | medium | low

  - finding: [key insight]
    source: [where found]
    reliability: high | medium | low

detailed_findings:
  web:
    - title: [article/doc title]
      url: [source URL]
      summary: |
        [key takeaways]
      relevance: high | medium | low

  documentation:
    - file: [doc path]
      summary: |
        [key information]

  code:
    - location: [file/function]
      insight: |
        [what the code reveals]

synthesis: |
  [Combined understanding from all sources]
  [How findings relate to each other]
  [Overall conclusion]

recommendations:
  - [actionable next step 1]
  - [actionable next step 2]

gaps:
  - [what couldn't be found]
  - [areas needing more research]

sources:
  - [list of all sources used with links]
```

## Research Quality

### Quick Depth

- Top search results
- Key documentation sections
- Main implementation files
- 5-10 minute research

### Thorough Depth

- Comprehensive search
- Full documentation review
- Complete code analysis
- Cross-referencing sources
- 15-30 minute research

## Best Practices

- Verify information from multiple sources
- Note when information might be outdated
- Distinguish facts from opinions
- Cite sources for traceability
- Flag conflicting information
- Focus on relevance to the question
