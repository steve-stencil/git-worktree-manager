/**
 * Configuration loading for git-worktree-manager
 *
 * Loads configuration from:
 * 1. ~/.wtconfig (global user config)
 * 2. .wtconfig in the main worktree root (project config)
 *
 * Project config values override global config values.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { type Config, DEFAULT_CONFIG } from './types.js';
import { ConfigParseError } from './errors.js';

/**
 * Path to the global user config file
 */
export const GLOBAL_CONFIG_PATH = join(homedir(), '.wtconfig');

/**
 * Name of the project config file
 */
export const PROJECT_CONFIG_FILENAME = '.wtconfig';

/**
 * Parse a shell-style config file content into a partial Config object.
 *
 * Supports:
 * - KEY=value
 * - KEY="value"
 * - KEY='value'
 * - # comments
 * - Empty lines
 *
 * @param content - The file content to parse
 * @param filePath - Path to the file (for error messages)
 * @returns Partial config object
 */
export function parseConfigFile(content: string, filePath: string): Partial<Config> {
  const config: Partial<Config> = {};
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';

    // Skip empty lines and comments
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    // Parse KEY=value
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) {
      // Ignore lines that don't match the pattern (like shell commands)
      continue;
    }

    const [, key, rawValue] = match;
    if (!key || rawValue === undefined) continue;

    // Remove quotes if present
    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Map config keys to our Config type
    switch (key) {
      case 'EDITOR_CMD':
        config.editorCmd = value;
        break;
      case 'BASE_API_PORT': {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new ConfigParseError(filePath, new Error(`Invalid BASE_API_PORT value: ${value}`));
        }
        config.baseApiPort = port;
        break;
      }
      case 'BASE_WEB_PORT': {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new ConfigParseError(filePath, new Error(`Invalid BASE_WEB_PORT value: ${value}`));
        }
        config.baseWebPort = port;
        break;
      }
      case 'BASE_BRANCH':
        if (value.trim()) {
          config.baseBranch = value.trim();
        }
        break;
      // Ignore unknown keys (forward compatibility)
    }
  }

  return config;
}

/**
 * Load the global user config from ~/.wtconfig
 *
 * @returns Partial config or empty object if file doesn't exist
 */
export async function loadGlobalConfig(): Promise<Partial<Config>> {
  if (!existsSync(GLOBAL_CONFIG_PATH)) {
    return {};
  }

  try {
    const content = await readFile(GLOBAL_CONFIG_PATH, 'utf-8');
    return parseConfigFile(content, GLOBAL_CONFIG_PATH);
  } catch (error) {
    if (error instanceof ConfigParseError) {
      throw error;
    }
    // File read errors are not fatal - just return empty config
    return {};
  }
}

/**
 * Load the project config from .wtconfig in the given directory
 *
 * @param projectRoot - Path to the project root (main worktree)
 * @returns Partial config or empty object if file doesn't exist
 */
export async function loadProjectConfig(projectRoot: string): Promise<Partial<Config>> {
  const configPath = join(projectRoot, PROJECT_CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    return parseConfigFile(content, configPath);
  } catch (error) {
    if (error instanceof ConfigParseError) {
      throw error;
    }
    // File read errors are not fatal - just return empty config
    return {};
  }
}

/**
 * Merge multiple partial configs with defaults.
 * Later configs override earlier ones.
 *
 * @param configs - Array of partial configs to merge
 * @returns Complete Config object
 */
export function mergeConfigs(...configs: Partial<Config>[]): Config {
  const result = { ...DEFAULT_CONFIG };

  for (const config of configs) {
    if (config.editorCmd !== undefined) {
      result.editorCmd = config.editorCmd;
    }
    if (config.baseApiPort !== undefined) {
      result.baseApiPort = config.baseApiPort;
    }
    if (config.baseWebPort !== undefined) {
      result.baseWebPort = config.baseWebPort;
    }
    if (config.baseBranch !== undefined) {
      result.baseBranch = config.baseBranch;
    }
  }

  return result;
}

/**
 * Load the complete configuration for a project.
 *
 * Merges (in order of precedence, lowest to highest):
 * 1. Default values
 * 2. Global user config (~/.wtconfig)
 * 3. Project config (.wtconfig in main worktree)
 *
 * @param projectRoot - Path to the main worktree root
 * @returns Complete Config object
 */
export async function loadConfig(projectRoot: string): Promise<Config> {
  const globalConfig = await loadGlobalConfig();
  const projectConfig = await loadProjectConfig(projectRoot);

  return mergeConfigs(globalConfig, projectConfig);
}
