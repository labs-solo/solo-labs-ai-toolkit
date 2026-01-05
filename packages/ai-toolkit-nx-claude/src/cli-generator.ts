#!/usr/bin/env node

/**
 * CLI entry point for @solo-labs/ai-toolkit-nx-claude
 *
 * Usage:
 *   npx @solo-labs/ai-toolkit-nx-claude init [options]
 *   solo-labs-nx-claude init [options]
 *
 * Options:
 *   --installMode <default|custom>     Installation mode
 *   --installationType <global|local>  Where to install
 *   --dry                              Preview without making changes
 *   --force                            Overwrite existing files
 *   --nonInteractive                   Run without prompts
 */

import { initGenerator } from './generators/init/generator';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'init' || !command) {
    // Parse CLI arguments into options
    const options: Record<string, any> = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        if (value !== undefined) {
          // Handle --key=value format
          options[key] = value === 'true' ? true : value === 'false' ? false : value;
        } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
          // Handle --key value format
          const nextValue = args[i + 1];
          options[key] = nextValue === 'true' ? true : nextValue === 'false' ? false : nextValue;
          i++;
        } else {
          // Handle boolean flags
          options[key] = true;
        }
      }
    }

    // Use flushChanges to write the tree to disk
    const { flushChanges, FsTree } = await import('nx/src/generators/tree.js');
    const tree = new FsTree(process.cwd(), false);

    try {
      await initGenerator(tree, options);

      // Apply changes to the file system
      flushChanges(process.cwd(), tree.listChanges());

      process.exit(0);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else if (command === '--help' || command === '-h') {
    console.log(`
Solo Labs AI Toolkit for Claude Code

Usage:
  solo-labs-nx-claude init [options]
  npx @solo-labs/ai-toolkit-nx-claude init [options]

Commands:
  init    Install Solo Labs agents and commands for Claude Code

Options:
  --installMode <default|custom>     Installation mode (default: default)
  --installationType <global|local>  Where to install (default: global)
  --dry                              Preview without making changes
  --force                            Overwrite existing files
  --nonInteractive                   Run without prompts
  --help, -h                         Show this help message

Examples:
  # Default installation (recommended)
  solo-labs-nx-claude init

  # Custom installation with dry run
  solo-labs-nx-claude init --installMode=custom --dry

  # Global installation without prompts
  solo-labs-nx-claude init --installationType=global --nonInteractive
    `);
    process.exit(0);
  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Run "solo-labs-nx-claude --help" for usage information.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
