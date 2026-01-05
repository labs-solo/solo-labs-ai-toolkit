import type { Tree } from '@nx/devkit';
import { formatFiles, logger, writeJson } from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import type { InitGeneratorSchema } from './schema';
import { promptForMissingOptions } from '../../utils/prompt-utils';

interface ContentItem {
  description: string;
  filePath: string;
}

// Recommended default commands for Solo Labs
const DEFAULT_COMMANDS = [
  'explore',
  'explore-aegis',
  'plan',
  'review-plan',
  'execute-plan',
  'validate-invariants',
  'debug-l-units',
  'debug-collateral',
  'gen-foundry-tests',
];

// Recommended default agents for Solo Labs
const DEFAULT_AGENTS = [
  'aegis-architect',
  'l-unit-accountant',
  'context-loader',
  'planner',
  'plan-reviewer',
  'foundry-test-writer',
  'security-analyzer',
  'code-explainer',
];

interface Manifest {
  version: string;
  installedAt: string;
  commands: string[];
  agents: string[];
  files: string[];
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items));
}

// Dynamically load available commands and agents from filesystem
function loadAvailableContent(
  type: 'commands' | 'agents',
  workspaceRoot: string
): Record<string, ContentItem> {
  const result: Record<string, ContentItem> = {};

  // First check for bundled content (when running as standalone package)
  const bundledContentDir = path.join(__dirname, '..', '..', 'content', type);
  if (fs.existsSync(bundledContentDir)) {
    const contentSubDirs = fs.readdirSync(bundledContentDir).filter((item) => {
      const itemPath = path.join(bundledContentDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    for (const subDir of contentSubDirs) {
      const subDirPath = path.join(bundledContentDir, subDir);
      const files = fs.readdirSync(subDirPath).filter((f) => f.endsWith('.md'));

      for (const file of files) {
        const name = file.replace('.md', '');
        const filePath = path.join(subDirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract description from frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let description = '';
        if (frontmatterMatch) {
          const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
          if (descMatch) {
            description = descMatch[1].trim();
          }
        }

        result[name] = { description, filePath };
      }
    }
  }

  // Fall back to workspace lookup if bundled content not found or empty
  if (Object.keys(result).length === 0) {
    const baseDir = path.join(workspaceRoot, `packages/${type}`);
    if (fs.existsSync(baseDir)) {
      const subDirs = fs.readdirSync(baseDir).filter((item) => {
        const itemPath = path.join(baseDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      for (const subDir of subDirs) {
        const srcPath = path.join(baseDir, subDir, 'src');
        if (!fs.existsSync(srcPath)) continue;

        const files = fs.readdirSync(srcPath).filter((f) => f.endsWith('.md'));

        for (const file of files) {
          const name = file.replace('.md', '');
          const filePath = path.join(srcPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');

          // Extract description from frontmatter
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let description = '';
          if (frontmatterMatch) {
            const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
            if (descMatch) {
              description = descMatch[1].trim();
            }
          }

          result[name] = { description, filePath };
        }
      }
    }
  }

  return result;
}

function checkExistingFiles(
  targetDir: string,
  subDir: 'commands' | 'agents',
  items: string[]
): Set<string> {
  const existing = new Set<string>();
  const dir = path.join(targetDir, subDir);

  for (const item of items) {
    const filePath = path.join(dir, `${item}.md`);
    if (fs.existsSync(filePath)) {
      existing.add(item);
    }
  }

  return existing;
}

function getExplicitlyProvidedOptions(): Map<string, any> {
  const provided = new Map<string, any>();
  const args = process.argv.slice(2);

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key) {
        provided.set(key, value ?? true);
      }
    }
  }

  return provided;
}

export async function initGenerator(tree: Tree, options: InitGeneratorSchema) {
  const explicitlyProvided = getExplicitlyProvidedOptions();

  // Define directory paths
  const homeDir = os.homedir();
  const globalDir = path.join(homeDir, '.claude');
  const localDir = path.join(process.cwd(), '.claude');
  const workspaceRoot = process.cwd();

  // Dynamically load available commands and agents
  const commandsContent = loadAvailableContent('commands', workspaceRoot);
  const agentsContent = loadAvailableContent('agents', workspaceRoot);

  // Get available commands and agents
  const availableCommands = Object.keys(commandsContent);
  const availableAgents = Object.keys(agentsContent);

  // Extract descriptions
  const commandDescriptions = Object.fromEntries(
    Object.entries(commandsContent).map(([key, value]) => [key, value.description])
  );
  const agentDescriptions = Object.fromEntries(
    Object.entries(agentsContent).map(([key, value]) => [key, value.description])
  );

  // Check for existing files in both locations
  const globalExistingCommands = checkExistingFiles(globalDir, 'commands', availableCommands);
  const globalExistingAgents = checkExistingFiles(globalDir, 'agents', availableAgents);
  const localExistingCommands = checkExistingFiles(localDir, 'commands', availableCommands);
  const localExistingAgents = checkExistingFiles(localDir, 'agents', availableAgents);

  // Handle prompting via schema-driven system
  const schemaPath = path.join(__dirname, 'schema.json');

  let normalizedOptions;
  try {
    normalizedOptions = await promptForMissingOptions(
      options,
      schemaPath,
      {
        availableCommands,
        availableAgents,
        commandDescriptions,
        agentDescriptions,
        globalExistingCommands,
        globalExistingAgents,
        localExistingCommands,
        localExistingAgents,
        defaultCommands: DEFAULT_COMMANDS,
        defaultAgents: DEFAULT_AGENTS,
      },
      explicitlyProvided
    );
  } catch (error: any) {
    if (error.message?.includes('Installation cancelled')) {
      logger.warn(`❌ ${error.message}`);
      return;
    }
    throw error;
  }

  // Apply defaults for "default" mode
  const installMode = normalizedOptions.installMode;
  if (installMode === 'default') {
    logger.info('📦 Default Installation Mode');
    logger.info('   Installing recommended Solo Labs setup with pre-selected components\n');

    normalizedOptions.installationType = 'global';
    normalizedOptions.commands = DEFAULT_COMMANDS.filter((c) => availableCommands.includes(c));
    normalizedOptions.agents = DEFAULT_AGENTS.filter((a) => availableAgents.includes(a));
    normalizedOptions.installCommands = true;
    normalizedOptions.installAgents = true;
    normalizedOptions.dry = false;

    logger.info('📍 Location: Global (~/.claude)');
    logger.info(`📝 Commands: ${normalizedOptions.commands.length} pre-selected`);
    logger.info(`🤖 Agents: ${normalizedOptions.agents.length} pre-selected\n`);
  }

  // Handle 'all' selection modes
  if (normalizedOptions.commandSelectionMode === 'all') {
    normalizedOptions.commands = availableCommands;
    logger.info(`📝 All commands selected (${normalizedOptions.commands.length} total)`);
  }
  if (normalizedOptions.agentSelectionMode === 'all') {
    normalizedOptions.agents = availableAgents;
    logger.info(`🤖 All agents selected (${normalizedOptions.agents.length} total)`);
  }

  // Skip command/agent arrays if install flags are false
  if (normalizedOptions.installCommands === false) {
    normalizedOptions.commands = [];
  }
  if (normalizedOptions.installAgents === false) {
    normalizedOptions.agents = [];
  }

  // Determine target directory
  const isGlobalInstall = normalizedOptions.installationType === 'global';

  const targetDir = isGlobalInstall
    ? path.join(homeDir, '.claude')
    : path.join(workspaceRoot, '.claude');

  const relativeTargetDir = isGlobalInstall ? path.relative(workspaceRoot, targetDir) : '.claude';

  // Handle dry-run mode
  const isDryRun = normalizedOptions.dry === true;
  const forceOverwrite = normalizedOptions.force === true;
  if (isDryRun) {
    logger.info('🔍 DRY RUN MODE - No files will be modified');
  }
  if (forceOverwrite) {
    logger.info('⚠️  Force mode enabled - existing files may be overwritten');
  }

  // Collect installed items
  const installedCommands: string[] = [];
  const installedAgents: string[] = [];
  const installedFiles: string[] = [];
  const skippedExistingFiles: string[] = [];
  const overwrittenFiles: string[] = [];

  // Install selected commands
  const commandsToInstall = normalizedOptions.commands || [];

  for (const commandName of commandsToInstall) {
    const contentItem = commandsContent[commandName];
    const destPath = path.join(targetDir, 'commands', `${commandName}.md`);
    const relativeDestPath = path.join(relativeTargetDir, 'commands', `${commandName}.md`);
    const relativeFilePath = path.relative(targetDir, destPath);

    try {
      if (contentItem && fs.existsSync(contentItem.filePath)) {
        const destExists = fs.existsSync(destPath);
        if (destExists && !forceOverwrite) {
          skippedExistingFiles.push(relativeFilePath);
          continue;
        }

        const content = fs.readFileSync(contentItem.filePath, 'utf-8');
        if (!isDryRun) {
          tree.write(relativeDestPath, content);
        }
        if (destExists) {
          overwrittenFiles.push(relativeFilePath);
        }
        installedCommands.push(commandName);
        installedFiles.push(relativeFilePath);
      } else {
        logger.warn(`Command file not found: ${commandName}`);
      }
    } catch (error) {
      logger.warn(`Error reading command ${commandName}: ${error}`);
    }
  }

  // Install selected agents
  const agentsToInstall = normalizedOptions.agents || [];

  for (const agentName of agentsToInstall) {
    const contentItem = agentsContent[agentName];
    const destPath = path.join(targetDir, 'agents', `${agentName}.md`);
    const relativeDestPath = path.join(relativeTargetDir, 'agents', `${agentName}.md`);
    const relativeFilePath = path.relative(targetDir, destPath);

    try {
      if (contentItem && fs.existsSync(contentItem.filePath)) {
        const destExists = fs.existsSync(destPath);
        if (destExists && !forceOverwrite) {
          skippedExistingFiles.push(relativeFilePath);
          continue;
        }

        const content = fs.readFileSync(contentItem.filePath, 'utf-8');
        if (!isDryRun) {
          tree.write(relativeDestPath, content);
        }
        if (destExists) {
          overwrittenFiles.push(relativeFilePath);
        }
        installedAgents.push(agentName);
        installedFiles.push(relativeFilePath);
      } else {
        logger.warn(`Agent file not found: ${agentName}`);
      }
    } catch (error) {
      logger.warn(`Error reading agent ${agentName}: ${error}`);
    }
  }

  // Display installation plan
  logger.info('📦 Installation Plan:');
  logger.info(
    `  Location: ${
      normalizedOptions.installationType === 'global'
        ? `Global (${targetDir})`
        : `Local (${targetDir})`
    }`
  );
  logger.info(`  Commands: ${installedCommands.length} to install`);
  logger.info(`  Agents: ${installedAgents.length} to install`);

  if (skippedExistingFiles.length > 0) {
    logger.info(`  Skipped: ${skippedExistingFiles.length} existing files (use --force to overwrite)`);
  }
  if (overwrittenFiles.length > 0) {
    logger.info(`  Overwriting: ${overwrittenFiles.length} existing files`);
  }

  if (isDryRun) {
    logger.info('\n📋 Would install:');
    installedFiles.forEach((file) => {
      logger.info(`  - ${file}`);
    });
    if (skippedExistingFiles.length > 0) {
      logger.info('\n⏭️ Skipped (already exists):');
      skippedExistingFiles.forEach((file) => {
        logger.info(`  - ${file}`);
      });
    }
    return;
  }

  // Merge with existing manifest if present (avoid losing prior installs)
  const manifestPath = path.join(targetDir, 'manifest.json');
  let existingManifest: Partial<Manifest> | null = null;
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Partial<Manifest>;
    } catch (error) {
      logger.warn(`⚠️  Failed to read existing manifest.json (will rewrite): ${error}`);
    }
  }

  const manifest: Manifest = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    commands: uniqueStrings([
      ...normalizeStringArray(existingManifest?.commands),
      ...installedCommands,
    ]),
    agents: uniqueStrings([...normalizeStringArray(existingManifest?.agents), ...installedAgents]),
    files: uniqueStrings([...normalizeStringArray(existingManifest?.files), ...installedFiles]),
  };

  const relativeManifestPath = path.join(relativeTargetDir, 'manifest.json');
  writeJson(tree, relativeManifestPath, manifest);

  await formatFiles(tree);

  logger.info('✅ Solo Labs Claude Code configuration installed successfully!');
  logger.info(`📁 Location: ${targetDir}`);
  logger.info(`📝 Use these in Claude Code immediately`);

  // Final summary
  logger.info('\n✨ Installation complete!');
  if (installedCommands.length > 0) {
    logger.info(`   Commands: ${installedCommands.join(', ')}`);
  }
  if (installedAgents.length > 0) {
    logger.info(`   Agents: ${installedAgents.join(', ')}`);
  }
}

export default initGenerator;
