/**
 * Environment file management for worktrees
 */

import { existsSync, unlinkSync, lstatSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { type EnvFileInfo, type EnvFileType, type PortAllocation } from './types.js';
import { EnvCopyError } from './errors.js';

/**
 * Common env file locations to check
 */
const ENV_LOCATIONS: Array<{ path: string; type: EnvFileType }> = [
  { path: '.env', type: 'root' },
  { path: 'apps/api/.env', type: 'api' },
  { path: 'apps/web/.env', type: 'web' },
  { path: 'packages/api/.env', type: 'api' },
];

/**
 * Detect env file structure in a project.
 */
export function detectEnvStructure(projectRoot: string): EnvFileInfo[] {
  const envFiles: EnvFileInfo[] = [];

  for (const loc of ENV_LOCATIONS) {
    const absolutePath = join(projectRoot, loc.path);
    envFiles.push({
      relativePath: loc.path,
      absolutePath,
      type: loc.type,
      exists: existsSync(absolutePath),
    });
  }

  return envFiles.filter((f) => f.exists);
}

/**
 * Port variables to substitute based on env type
 */
type PortSubstitution = {
  pattern: RegExp;
  replacement: (ports: PortAllocation) => string;
};

const API_SUBSTITUTIONS: PortSubstitution[] = [
  { pattern: /^PORT=.*/m, replacement: (p) => `PORT=${p.apiPort}` },
  { pattern: /^APP_URL=.*/m, replacement: (p) => `APP_URL=http://localhost:${p.webPort}` },
];

const WEB_SUBSTITUTIONS: PortSubstitution[] = [
  {
    pattern: /^VITE_API_BASE=.*/m,
    replacement: (p) => `VITE_API_BASE=http://localhost:${p.apiPort}/api`,
  },
  { pattern: /^VITE_PORT=.*/m, replacement: (p) => `VITE_PORT=${p.webPort}` },
  { pattern: /^PORT=.*/m, replacement: (p) => `PORT=${p.webPort}` },
];

// Root substitutions: Use API port for PORT, Web port for VITE_PORT
const ROOT_SUBSTITUTIONS: PortSubstitution[] = [
  { pattern: /^PORT=.*/m, replacement: (p) => `PORT=${p.apiPort}` },
  { pattern: /^APP_URL=.*/m, replacement: (p) => `APP_URL=http://localhost:${p.webPort}` },
  {
    pattern: /^VITE_API_BASE=.*/m,
    replacement: (p) => `VITE_API_BASE=http://localhost:${p.apiPort}/api`,
  },
  { pattern: /^VITE_PORT=.*/m, replacement: (p) => `VITE_PORT=${p.webPort}` },
];

/**
 * Substitute port variables in env file content.
 */
export function substitutePortVars(
  content: string,
  type: EnvFileType,
  ports: PortAllocation
): string {
  let result = content;

  const substitutions =
    type === 'api' ? API_SUBSTITUTIONS : type === 'web' ? WEB_SUBSTITUTIONS : ROOT_SUBSTITUTIONS;

  for (const sub of substitutions) {
    if (sub.pattern.test(result)) {
      result = result.replace(sub.pattern, sub.replacement(ports));
    }
  }

  return result;
}

/**
 * Copy an env file from source to target with port substitution.
 */
export async function copyEnvFile(
  sourcePath: string,
  targetPath: string,
  type: EnvFileType,
  ports: PortAllocation
): Promise<void> {
  try {
    // Ensure target directory exists
    const targetDir = dirname(targetPath);
    await mkdir(targetDir, { recursive: true });

    // Remove symlink if exists
    if (existsSync(targetPath) && lstatSync(targetPath).isSymbolicLink()) {
      unlinkSync(targetPath);
    }

    // Read source content
    const content = await readFile(sourcePath, 'utf-8');

    // Substitute port variables
    const modifiedContent = substitutePortVars(content, type, ports);

    // Write to target
    await writeFile(targetPath, modifiedContent, 'utf-8');
  } catch (error) {
    throw new EnvCopyError(
      sourcePath,
      targetPath,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Set up environment files for a worktree.
 */
export async function setupEnvironment(
  mainWorktreePath: string,
  targetWorktreePath: string,
  ports: PortAllocation
): Promise<{ configured: boolean; files: string[] }> {
  const envFiles = detectEnvStructure(mainWorktreePath);

  if (envFiles.length === 0) {
    return { configured: false, files: [] };
  }

  const copiedFiles: string[] = [];

  for (const envFile of envFiles) {
    const targetPath = join(targetWorktreePath, envFile.relativePath);

    await copyEnvFile(envFile.absolutePath, targetPath, envFile.type, ports);
    copiedFiles.push(envFile.relativePath);
  }

  return { configured: true, files: copiedFiles };
}
