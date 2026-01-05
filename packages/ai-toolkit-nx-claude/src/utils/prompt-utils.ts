import { prompt } from 'enquirer';
import * as fs from 'fs';

export interface SchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
  default?: any;
  'x-prompt'?:
    | string
    | {
        message: string;
        type?: string;
        items?: Array<{ value: string; label: string }>;
      };
  'x-skip-prompt'?: boolean;
  'always-prompt'?: boolean;
  'prompt-message'?: string;
  'prompt-type'?: string;
  'prompt-items'?: Array<{ value: string; label: string }>;
  'prompt-when'?: string;
}

export interface Schema {
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export async function promptForMissingOptions<T extends Record<string, any>>(
  options: T,
  schemaPath: string | Schema,
  context: {
    availableCommands?: string[];
    availableAgents?: string[];
    commandDescriptions?: Record<string, string>;
    agentDescriptions?: Record<string, string>;
    globalExistingCommands?: Set<string>;
    globalExistingAgents?: Set<string>;
    localExistingCommands?: Set<string>;
    localExistingAgents?: Set<string>;
    defaultCommands?: string[];
    defaultAgents?: string[];
  } = {},
  explicitlyProvidedOptions?: Map<string, any> | Set<string>
): Promise<T> {
  // Load schema - support both file path and direct schema object
  let schema: Schema;
  if (typeof schemaPath === 'string') {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(schemaContent);
  } else {
    schema = schemaPath;
  }

  const result: any = { ...options };

  // Skip all prompts if no-interactive
  if (
    result['no-interactive'] ||
    result.noInteractive ||
    result['non-interactive'] ||
    result.nonInteractive
  ) {
    // Apply defaults for any missing values
    for (const [key, property] of Object.entries(schema.properties)) {
      if (result[key] === undefined && property.default !== undefined) {
        result[key] = property.default;
      }
    }
    return result;
  }

  // Process each property in order
  for (const [key, property] of Object.entries(schema.properties)) {
    // Check if value was explicitly provided via CLI
    let wasExplicitlyProvided = false;
    if (explicitlyProvidedOptions) {
      if (explicitlyProvidedOptions instanceof Map) {
        wasExplicitlyProvided =
          explicitlyProvidedOptions.has(key) ||
          explicitlyProvidedOptions.has(key.replace(/-/g, ''));
      } else {
        wasExplicitlyProvided =
          explicitlyProvidedOptions.has(key) ||
          explicitlyProvidedOptions.has(key.replace(/-/g, ''));
      }
    }

    // Check if this property should skip prompting entirely
    if (property['x-skip-prompt']) {
      if (result[key] === undefined && property.default !== undefined) {
        result[key] = property.default;
      }
      continue;
    }

    // Determine if we should prompt for this property
    const shouldPrompt = property['always-prompt']
      ? !wasExplicitlyProvided
      : (result[key] === undefined || result[key] === null) &&
        !wasExplicitlyProvided;

    if (!shouldPrompt) {
      continue;
    }

    // Special handling for certain fields
    if (key === 'confirmLocalPath') {
      if (result.installationType !== 'local') {
        continue;
      }
    }

    if (
      key === 'nonInteractive' ||
      key === 'non-interactive' ||
      key === 'no-interactive' ||
      key === 'noInteractive' ||
      key === 'force'
    ) {
      continue;
    }

    // Check for conditional prompting (prompt-when)
    if (property['prompt-when']) {
      const shouldShow = evaluatePromptCondition(property['prompt-when'], result);
      if (!shouldShow) {
        continue;
      }
    }

    // Generate prompt based on property type
    const promptResult = await promptForProperty(key, property, context, result);
    if (promptResult !== undefined) {
      result[key] = promptResult;

      // If installMode=default was selected, apply all default values
      if (key === 'installMode' && promptResult === 'default') {
        result.installationType = 'global';
        result.installCommands = true;
        result.installAgents = true;
        result.dry = false;
        result.commandSelectionMode = 'all';
        result.agentSelectionMode = 'all';

        if (context.defaultCommands) {
          result.commands = context.defaultCommands;
        }
        if (context.defaultAgents) {
          result.agents = context.defaultAgents;
        }

        // Mark these as explicitly provided
        if (explicitlyProvidedOptions instanceof Map) {
          explicitlyProvidedOptions.set('installMode', 'default');
          explicitlyProvidedOptions.set('installationType', 'global');
          explicitlyProvidedOptions.set('installCommands', true);
          explicitlyProvidedOptions.set('installAgents', true);
          explicitlyProvidedOptions.set('dry', false);
          explicitlyProvidedOptions.set('commandSelectionMode', 'all');
          explicitlyProvidedOptions.set('agentSelectionMode', 'all');
        }
      }

      // Handle local path confirmation
      if (
        key === 'confirmLocalPath' &&
        result.installationType === 'local' &&
        promptResult === false
      ) {
        throw new Error('Installation cancelled - please run from your project root');
      }
    }
  }

  return result as T;
}

async function promptForProperty(
  key: string,
  property: SchemaProperty,
  context: {
    availableCommands?: string[];
    availableAgents?: string[];
    commandDescriptions?: Record<string, string>;
    agentDescriptions?: Record<string, string>;
    globalExistingCommands?: Set<string>;
    globalExistingAgents?: Set<string>;
    localExistingCommands?: Set<string>;
    localExistingAgents?: Set<string>;
    defaultCommands?: string[];
    defaultAgents?: string[];
  },
  currentValues?: Record<string, any>
): Promise<any> {
  const promptMessage = getPromptMessage(key, property);

  const promptType =
    property['prompt-type'] ||
    (property.type === 'boolean'
      ? 'confirm'
      : property.enum
        ? 'select'
        : property.type === 'string'
          ? 'input'
          : null);

  if (promptType === 'confirm' || property.type === 'boolean') {
    const { value } = await prompt<{ value: boolean }>({
      type: 'confirm',
      name: 'value',
      message: promptMessage,
      initial: property.default ?? false,
    });
    return value;
  }

  if (promptType === 'list' && property['prompt-items']) {
    const { value } = await prompt<{ value: string }>({
      type: 'select',
      name: 'value',
      message: promptMessage,
      choices: property['prompt-items'].map((item) => ({
        name: item.value,
        value: item.value,
        message: item.label,
      })),
    } as any);
    return value;
  }

  if (property.enum) {
    const { value } = await prompt<{ value: string }>({
      type: 'select',
      name: 'value',
      message: promptMessage,
      choices: property.enum.map((choice: string) => ({
        name: choice,
        value: choice,
      })),
    } as any);
    return value;
  }

  if (property.type === 'array') {
    if (key === 'commands' && context.availableCommands) {
      const installationType = currentValues?.installationType;
      let existingSet: Set<string> | undefined;
      let otherLocationSet: Set<string> | undefined;

      if (installationType === 'global') {
        existingSet = context.globalExistingCommands;
        otherLocationSet = context.localExistingCommands;
      } else if (installationType === 'local') {
        existingSet = context.localExistingCommands;
        otherLocationSet = context.globalExistingCommands;
      }

      return await promptMultiSelectWithAll(
        promptMessage,
        context.availableCommands,
        'commands',
        context.commandDescriptions,
        existingSet,
        otherLocationSet,
        installationType
      );
    }

    if (key === 'agents' && context.availableAgents) {
      const installationType = currentValues?.installationType;
      let existingSet: Set<string> | undefined;
      let otherLocationSet: Set<string> | undefined;

      if (installationType === 'global') {
        existingSet = context.globalExistingAgents;
        otherLocationSet = context.localExistingAgents;
      } else if (installationType === 'local') {
        existingSet = context.localExistingAgents;
        otherLocationSet = context.globalExistingAgents;
      }

      return await promptMultiSelectWithAll(
        promptMessage,
        context.availableAgents,
        'agents',
        context.agentDescriptions,
        existingSet,
        otherLocationSet,
        installationType
      );
    }

    return [];
  }

  if (property.type === 'string') {
    const { value } = await prompt<{ value: string }>({
      type: 'input',
      name: 'value',
      message: promptMessage,
      initial: property.default ?? '',
    });
    return value;
  }

  return undefined;
}

async function promptMultiSelectWithAll(
  message: string,
  choices: string[],
  type: 'commands' | 'agents',
  descriptions?: Record<string, string>,
  existingItems?: Set<string>,
  otherLocationItems?: Set<string>,
  installationType?: 'global' | 'local'
): Promise<string[] | undefined> {
  const displayChoices = choices.map((choice) => {
    let display = descriptions?.[choice]
      ? `${choice}: ${descriptions[choice]}`
      : choice;

    const indicators: string[] = [];

    if (existingItems?.has(choice)) {
      indicators.push('exists (use --force to overwrite)');
    }

    if (otherLocationItems?.has(choice)) {
      const otherLocation = installationType === 'global' ? 'locally' : 'globally';
      indicators.push(`exists ${otherLocation}`);
    }

    if (indicators.length > 0) {
      display += ` (${indicators.join(', ')})`;
    }

    return display;
  });

  const response = await prompt<{ selected: string[] }>({
    type: 'multiselect',
    name: 'selected',
    message,
    choices: displayChoices,
    initial: displayChoices.map((_, index) => index),
    hint: 'Use <space> to select, <a> to toggle all, <return> to submit',
    validate: (value: string[]) => {
      if (value.length === 0) {
        return `Please select at least one ${type.slice(0, -1)}`;
      }
      return true;
    },
  } as any);

  const selected = response.selected || [];

  const actualSelections: string[] = [];
  for (const selection of selected) {
    const colonIndex = selection.indexOf(':');
    const parenIndex = selection.indexOf('(');

    let endIndex = selection.length;
    if (colonIndex > -1 && (parenIndex === -1 || colonIndex < parenIndex)) {
      endIndex = colonIndex;
    } else if (parenIndex > -1 && (colonIndex === -1 || parenIndex < colonIndex)) {
      endIndex = parenIndex;
    }

    const name = selection.substring(0, endIndex).trim();
    if (name && !actualSelections.includes(name)) {
      actualSelections.push(name);
    }
  }

  return actualSelections;
}

function getPromptMessage(key: string, property: SchemaProperty): string {
  if (property['prompt-message']) {
    return property['prompt-message'];
  }

  if (property['x-prompt']) {
    if (typeof property['x-prompt'] === 'string') {
      return property['x-prompt'];
    }
    if (property['x-prompt'].message) {
      return property['x-prompt'].message;
    }
  }

  const description = property.description || '';

  switch (key) {
    case 'installationType':
      return 'Would you like to install agents and commands globally or locally?';
    case 'confirmLocalPath':
      return 'Are you running this from the root of your project?';
    case 'commands':
      return 'Select commands to install (use <space> to select, <a> to toggle all):';
    case 'agents':
      return 'Select agents to install (use <space> to select, <a> to toggle all):';
    case 'force':
      return 'Overwrite existing installation?';
    default:
      return description || `Enter value for ${key}:`;
  }
}

function evaluatePromptCondition(condition: string, context: any): boolean {
  if (condition.includes(' && ')) {
    const parts = condition.split(' && ');
    return parts.every((part) => evaluateSingleCondition(part.trim(), context));
  }

  if (condition.includes(' || ')) {
    const parts = condition.split(' || ');
    return parts.some((part) => evaluateSingleCondition(part.trim(), context));
  }

  return evaluateSingleCondition(condition, context);
}

function evaluateSingleCondition(condition: string, context: any): boolean {
  const parts = condition.split(' ');
  if (parts.length < 3) {
    return false;
  }

  const field = parts[0];
  const operator = parts[1];
  const value = parts.slice(2).join(' ').replace(/['"]/g, '');

  const fieldValue = context[field];

  switch (operator) {
    case '===':
      if (value === 'true') {
        return fieldValue === true;
      }
      if (value === 'false') {
        return fieldValue === false;
      }
      return String(fieldValue) === value;

    case '!==':
      if (value === 'true') {
        return fieldValue !== true;
      }
      if (value === 'false') {
        return fieldValue !== false;
      }
      return String(fieldValue) !== value;

    default:
      return false;
  }
}
