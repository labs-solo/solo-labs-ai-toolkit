---
description: Review code for quality, patterns, and potential issues without a PR context
argument-hint: <path> [--focus security|performance|quality] [--depth quick|thorough]
allowed-tools: Read(*), Glob(*), Grep(*), Task(subagent_type:pr-reviewer), Task(subagent_type:context-loader)
---

## Inputs

Parse arguments from `$ARGUMENTS`:

- `path`: File or directory to review (required)
- `--focus`: Review focus: `security` | `performance` | `quality` | `all` (default: all)
- `--depth`: Review depth: `quick` | `thorough` (default: thorough)
- `--pattern`: Check specific pattern (e.g., "error-handling", "naming")

Examples:

- `/review-code src/utils/parser.ts`
- `/review-code src/auth/ --focus security`
- `/review-code contracts/ --depth quick`
- `/review-code src/handlers/ --pattern error-handling`

## Task

Review code quality without PR context by:

1. Reading and analyzing the specified code
2. Checking for common issues and anti-patterns
3. Verifying alignment with project patterns
4. Providing actionable feedback

## Review Scope

### Quick Review

- Obvious bugs and issues
- Security red flags
- Naming and style issues
- Missing error handling

### Thorough Review

- All of quick review plus:
- Design pattern adherence
- Performance implications
- Test coverage assessment
- Documentation quality
- Maintainability concerns

## Process

1. **Gather Files**: Collect files from specified path
2. **Load Context**: Get project patterns from context-loader
3. **Analyze Code**: Review each file systematically
4. **Aggregate Findings**: Consolidate issues and suggestions
5. **Report**: Present structured feedback

## Delegation

Invoke **pr-reviewer** with:

- `pr`: Code content (not from a PR, but same analysis)
- `focus`: From --focus argument
- `context`: Codebase patterns from context-loader

## Output

```yaml
summary:
  path: [reviewed path]
  files_reviewed: [count]
  depth: quick | thorough
  overall_quality: excellent | good | needs_improvement | poor

findings:
  critical:
    - file: [path]
      line: [line]
      issue: [description]
      fix: [suggestion]

  major:
    - file: [path]
      line: [line]
      issue: [description]
      fix: [suggestion]

  minor:
    - file: [path]
      line: [line]
      issue: [description]
      fix: [suggestion]

patterns:
  followed:
    - [patterns correctly used]
  violated:
    - pattern: [pattern name]
      location: [where]
      fix: [how to correct]

recommendations:
  - priority: high | medium | low
    description: [improvement suggestion]
    impact: [why this matters]

metrics:
  complexity_hotspots: [files with high complexity]
  coverage_gaps: [areas lacking tests]
  documentation_quality: [assessment]
```

## Focus Areas

### Security Focus

- Input validation
- Authentication checks
- Authorization patterns
- Sensitive data handling
- Injection vulnerabilities
- Cryptography usage

### Performance Focus

- Algorithm efficiency
- Database query patterns
- Caching opportunities
- Memory management
- Async/await usage
- Bundle size impact

### Quality Focus

- Code clarity
- DRY violations
- SOLID principles
- Error handling
- Type safety
- Test coverage

## Output Formats

By default, returns YAML. The review can be used to:

- Fix issues immediately
- Create a task list for improvements
- Generate documentation of technical debt
- Prioritize refactoring work
