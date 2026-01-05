# CLAUDE.md - @solo-labs/ai-toolkit-nx-claude

## Package Overview

This package is an Nx generator that provides one-shot installation of Solo Labs
AI toolkit components (agents and commands) for Claude Code. It transforms the
toolkit from scattered markdown files into an installable package with a
single-command setup experience.

## Architecture

### Dynamic Content Loading Strategy

The generator uses a dual-resolution strategy to discover and load content:

1. **Bundled Content** (for standalone distribution):
   - Location: `dist/content/commands/` and `dist/content/agents/`
   - Created during build via asset copying in `package.json`
   - Contains 28 commands and 28 agents from agnostic packages
   - Used when package is installed via npm

2. **Workspace Content** (for development):
   - Location: `packages/commands/*/src/` and `packages/agents/*/src/`
   - Discovers all available markdown files dynamically
   - Finds 33 commands and 34 agents (more than bundled)
   - Used when running from monorepo workspace

### Content Discovery Process

1. **Filesystem Scanning**: `loadAvailableContent()` function scans directories
   for `*.md` files
2. **Frontmatter Parsing**: Extracts YAML frontmatter to get descriptions
3. **Registry Building**: Creates `Record<string, ContentItem>` with file paths
4. **Prompt Generation**: Uses descriptions for interactive selection prompts

### Installation Flow

```text
User runs: nx generate @solo-labs/ai-toolkit-nx-claude:init
    ↓
Schema-driven prompts (via prompt-utils.ts)
    ↓
User selects: mode, location, components
    ↓
Generator reads markdown files from source
    ↓
Writes to target directory (global or local)
    ↓
Creates manifest.json for tracking
```

## Key Components

### generator.ts

Main generator logic with these critical functions:

- `loadAvailableContent()`: Dynamically discovers commands/agents from filesystem
- `checkExistingFiles()`: Checks for file conflicts
- `initGenerator()`: Main entry point, orchestrates installation

**Important Design Decisions:**

1. **No direct imports of content packages**: Originally tried
   `import { commands } from '@solo-labs/commands-agnostic'` but this caused
   TypeScript rootDir errors. Solution: Read files directly from filesystem.

2. **Dual resolution**: Checks bundled content first, falls back to workspace.
   This enables both npm distribution and monorepo development.

3. **Default mode**: Pre-selects 9 commands and 8 agents for quick setup.
   Reduces decision fatigue while maintaining flexibility.

### prompt-utils.ts

Schema-driven interactive prompting system:

- Reads `schema.json` to generate prompts
- Supports conditional prompts via `prompt-when` field
- Handles multi-select, single-select, and boolean inputs
- Applies defaults intelligently

**Critical Pattern**: Conditional prompts must NOT have `x-prompt` property.
Only use `prompt-when` at property level. See CLAUDE.md for full details.

### schema.json

Defines generator options and interactive prompts:

- `installMode`: default (recommended) vs custom (choose everything)
- `installationType`: global (~/.claude) vs local (./.claude)
- `commandSelectionMode` / `agentSelectionMode`: all vs specific
- `commands` / `agents`: Arrays for specific selections

**Conditional Prompting**: Uses `prompt-when` to show/hide prompts based on
other values. For example, `installationType` only appears when
`installMode === 'custom'`.

### cli-generator.ts

Standalone CLI entry point:

- Parses command-line arguments
- Creates FsTree from `nx/src/generators/tree` (not `@nx/devkit`)
- Calls initGenerator with parsed options
- Flushes changes to filesystem

**Critical Fix**: Must import FsTree from `nx/src/generators/tree` because it's
not exported from `@nx/devkit`.

## Build Process

### package.json Targets

1. **bundle**: esbuild compilation of TypeScript to CommonJS
   - Entry points: `cli-generator.ts`, `index.ts`, `generator.ts`
   - External: Nx dependencies to avoid bundling
   - Assets: Copies markdown files to `dist/content/`

2. **generate-types**: TypeScript declaration file generation
   - Uses `tsconfig.types.json`
   - Outputs to `dist/`

3. **build**: Orchestrates bundle and type generation
   - Depends on building content packages first
   - Ensures content is available before bundling

4. **postbuild**: Makes CLI executable
   - `chmod +x dist/cli-generator.cjs`

### Asset Copying Strategy

The build copies markdown files from content packages:

```json
{
  "input": "./packages/commands/agnostic/src",
  "glob": "**/*.md",
  "output": "content/commands/agnostic"
}
```

This creates the bundled content structure used by standalone package.

## Usage Patterns

### Default Mode (Recommended for most users)

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init
```

Installs 9 recommended commands and 8 agents to global directory.

### Custom Mode (Full control)

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init --installMode=custom
```

Shows interactive prompts for location and component selection.

### Non-Interactive (CI/CD)

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init \
  --installMode=custom \
  --installationType=local \
  --commandSelectionMode=all \
  --agentSelectionMode=all \
  --nonInteractive
```

### Dry Run (Preview)

```bash
nx generate @solo-labs/ai-toolkit-nx-claude:init --dry
```

Shows what would be installed without making changes.

## Dependencies

### Runtime Dependencies

- `@nx/devkit`: Tree operations and logging
- `nx/src/generators/tree`: FsTree and flushChanges
- `enquirer`: Interactive prompts
- `fs`, `path`, `os`: Node.js filesystem operations

### Build Dependencies

- `@nx/esbuild`: Bundling
- `@nx/js`: Type generation
- `esbuild`: Fast TypeScript compilation

## Manifest Tracking

After installation, creates `manifest.json`:

```json
{
  "version": "1.0.0",
  "installedAt": "2026-01-05T21:19:20.743Z",
  "commands": ["explore", "plan", ...],
  "agents": ["planner", "aegis-architect", ...],
  "files": ["commands/explore.md", "agents/planner.md", ...]
}
```

This enables:

- Version tracking
- Installation auditing
- Upgrade detection (future feature)
- Uninstall support (future feature)

## Error Handling

### Common Issues

1. **FsTree import error**: Must import from `nx/src/generators/tree`, not
   `@nx/devkit`

2. **TypeScript rootDir errors**: Occurs when trying to import content packages
   directly. Solution: Use filesystem reading instead.

3. **NX_WORKSPACE_ROOT_PATH required**: When running from monorepo, Nx needs
   workspace root set via environment variable.

4. **Content not found**: Generator checks bundled content first, then workspace
   content. If neither exists, shows warning.

## Testing Strategy

### Manual Testing Commands

```bash
# Test help
nx generate @solo-labs/ai-toolkit-nx-claude:init --help

# Test default mode
nx generate @solo-labs/ai-toolkit-nx-claude:init --dry

# Test custom mode with all options
nx generate @solo-labs/ai-toolkit-nx-claude:init \
  --installMode=custom \
  --installationType=local \
  --commandSelectionMode=all \
  --agentSelectionMode=all \
  --nonInteractive --dry

# Test CLI directly
node packages/ai-toolkit-nx-claude/dist/cli-generator.cjs --help

# Test from outside monorepo
cd /tmp && node /path/to/dist/cli-generator.cjs --help
```

### Verification Checklist

- [ ] Generator executes without errors
- [ ] Files written to correct location (global or local)
- [ ] Manifest.json created with correct counts
- [ ] Markdown files preserve YAML frontmatter
- [ ] CLI help displays correctly
- [ ] Dry run shows correct preview
- [ ] Force flag overwrites existing files
- [ ] Non-interactive mode works with all flags

## Recent Changes

### 2026-01-05: Initial Implementation

- Created complete Nx generator package from scratch
- Implemented dynamic content loading to avoid TypeScript compilation errors
- Added schema-driven conditional prompting
- Built and tested with 28 commands and 28 agents bundled
- Verified 33 commands and 34 agents discoverable from workspace
- Created comprehensive README and CLAUDE.md documentation
- Successfully tested all installation modes (default, custom, dry-run)

### Design Evolution

**Problem**: Original design tried to import content packages directly:

```typescript
import { commands } from '@solo-labs/commands-agnostic';
```

This caused TypeScript error: "File is not under 'rootDir'".

**Solution**: Implemented dynamic content loading by reading markdown files
from filesystem. This approach:

- Avoids TypeScript compilation issues
- Supports both bundled and workspace content
- Enables discovery of all available content
- Maintains flexibility for future content packages

## Development Guidelines

### Adding New Content Packages

To add new command/agent packages to the bundle:

1. Add asset entry to `package.json` bundle configuration:

```json
{
  "input": "./packages/commands/new-package/src",
  "glob": "**/*.md",
  "output": "content/commands/new-package"
}
```

1. The generator will automatically discover new content via dynamic loading

1. Rebuild: `nx run @solo-labs/ai-toolkit-nx-claude:build`

### Modifying Default Recommendations

Edit `DEFAULT_COMMANDS` and `DEFAULT_AGENTS` arrays in `generator.ts`:

```typescript
const DEFAULT_COMMANDS = [
  'explore',
  'plan',
  // ... add new defaults
];
```

### Schema Changes

When adding new options:

1. Update `schema.json` with new property
2. Add TypeScript type to `schema.d.ts`
3. Update prompt-utils if custom logic needed
4. Test with `--help` to verify documentation

## Package Export

The package exports:

- `./package.json`: Package metadata
- `.` (main): Generator functions and types
  - `@solo-labs/source` condition: Source TypeScript for development
  - `types`: Type declarations
  - `import`: CommonJS bundle
- CLI: `dist/cli-generator.cjs` via `bin` field

## Future Enhancements

Potential improvements:

1. **Update command**: Check for newer versions and update installed components
2. **Uninstall command**: Remove installed components using manifest
3. **List command**: Show installed components and versions
4. **Diff command**: Compare installed vs available components
5. **Plugin system**: Allow third-party agent/command packages
6. **Template support**: Custom prompt templates for different workflows
7. **Configuration file**: `.sololabsrc` for project-specific defaults
8. **Migration guide**: Help users upgrade between major versions

## Integration Points

### With Nx Workspace

- Uses Nx project graph for dependency resolution
- Leverages Nx build caching
- Integrates with Nx generators system

### With Claude Code

- Installs to `.claude/` directory (Claude Code convention)
- Follows markdown format with YAML frontmatter
- Supports both global and local installation patterns

### With Content Packages

- Depends on `@solo-labs/commands-agnostic` and `@solo-labs/agents-agnostic`
- Reads markdown files directly from src/ directories
- Preserves YAML frontmatter for Claude Code compatibility
