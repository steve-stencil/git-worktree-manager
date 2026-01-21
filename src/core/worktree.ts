/**
 * Worktree CRUD operations
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  type WorktreeInfo,
  type CreateWorktreeOptions,
  type RemoveWorktreeOptions,
} from './types.js';
import {
  WorktreeNotFoundError,
  WorktreeExistsError,
  InvalidWorktreeNameError,
  GitCommandError,
} from './errors.js';
import {
  findMainWorktree,
  getRawWorktreeList,
  getRepoName,
  getParentDir,
  getCurrentBranch,
  branchExists,
  createGit,
  fetchRemote,
} from './git.js';

/**
 * Validate a worktree name.
 */
function validateWorktreeName(name: string): void {
  if (!name || name.trim() === '') {
    throw new InvalidWorktreeNameError(name, 'name cannot be empty');
  }
  if (name.includes('/')) {
    throw new InvalidWorktreeNameError(name, 'name cannot contain slashes');
  }
  if (name.includes('..')) {
    throw new InvalidWorktreeNameError(name, 'name cannot contain ".."');
  }
  if (name.startsWith('-')) {
    throw new InvalidWorktreeNameError(name, 'name cannot start with "-"');
  }
}

/**
 * Check if a directory has node_modules.
 */
function hasNodeModules(path: string): boolean {
  return existsSync(join(path, 'node_modules'));
}

/**
 * Check if a directory has any .env files in common locations.
 */
function hasEnvFiles(path: string): boolean {
  const envLocations = ['.env', 'apps/api/.env', 'apps/web/.env', 'packages/api/.env'];

  return envLocations.some((loc) => existsSync(join(path, loc)));
}

/**
 * Get last modified time of a directory.
 */
function getLastModified(path: string): Date {
  try {
    const stats = statSync(path);
    return stats.mtime;
  } catch {
    return new Date(0);
  }
}

/**
 * List all worktrees with their status information.
 */
export async function listWorktrees(cwd: string): Promise<WorktreeInfo[]> {
  const mainWorktree = await findMainWorktree(cwd);
  const rawList = await getRawWorktreeList(cwd);
  const repoName = getRepoName(mainWorktree);

  const worktrees: WorktreeInfo[] = [];

  for (const raw of rawList) {
    const isMain = raw.path === mainWorktree;
    let name: string;

    if (isMain) {
      name = 'main';
    } else {
      // Extract name from path, removing repo prefix if present
      const baseName = raw.path.split('/').pop() ?? '';
      name = baseName.startsWith(`${repoName}-`) ? baseName.slice(repoName.length + 1) : baseName;
    }

    worktrees.push({
      name,
      path: raw.path,
      branch: raw.branch ?? 'HEAD',
      isMain,
      hasEnv: hasEnvFiles(raw.path),
      hasDeps: hasNodeModules(raw.path),
      lastModified: getLastModified(raw.path),
      commitSha: raw.head,
      isDetached: raw.detached,
    });
  }

  return worktrees;
}

/**
 * Get a worktree by name.
 */
export async function getWorktreeByName(cwd: string, name: string): Promise<WorktreeInfo | null> {
  const worktrees = await listWorktrees(cwd);

  // Handle "main" or "MAIN" specially
  if (name.toLowerCase() === 'main') {
    return worktrees.find((wt) => wt.isMain) ?? null;
  }

  return worktrees.find((wt) => wt.name === name) ?? null;
}

/**
 * Get the expected path for a new worktree.
 */
export async function getWorktreePath(cwd: string, name: string): Promise<string> {
  const mainWorktree = await findMainWorktree(cwd);
  const repoName = getRepoName(mainWorktree);
  const parentDir = getParentDir(mainWorktree);

  return join(parentDir, `${repoName}-${name}`);
}

/**
 * Result from creating a worktree, includes fetch status.
 */
export type CreateWorktreeResult = {
  worktree: WorktreeInfo;
  fetched: boolean;
  baseBranch: string | null;
};

/**
 * Create a new worktree.
 *
 * When a `from` branch is specified, the new worktree branch will be based on
 * `origin/<from>` to ensure it's always using the latest remote state.
 * By default, fetches from remote first (use `noFetch: true` to skip).
 */
export async function createWorktree(options: CreateWorktreeOptions): Promise<CreateWorktreeResult> {
  const { name, branch, newBranch, from, noFetch = false, cwd = process.cwd() } = options;

  validateWorktreeName(name);

  const mainWorktree = await findMainWorktree(cwd);
  const worktreePath = await getWorktreePath(cwd, name);

  // Check if worktree already exists
  if (existsSync(worktreePath)) {
    throw new WorktreeExistsError(worktreePath);
  }

  const git = createGit(mainWorktree);
  let fetched = false;
  let baseBranch: string | null = null;

  // Fetch from remote if we have a base branch and noFetch is false
  if (from && !noFetch) {
    try {
      await fetchRemote(mainWorktree);
      fetched = true;
    } catch {
      // Fetch failed, continue without it (might be offline)
      fetched = false;
    }
  }

  try {
    if (newBranch) {
      // Create with explicit new branch name
      if (from) {
        // Base on remote branch
        baseBranch = `origin/${from}`;
        await git.raw(['worktree', 'add', '-b', newBranch, worktreePath, baseBranch]);
      } else {
        await git.raw(['worktree', 'add', '-b', newBranch, worktreePath]);
      }
    } else if (branch) {
      // Checkout existing branch
      await git.raw(['worktree', 'add', worktreePath, branch]);
    } else {
      // Create with default new branch name
      const defaultBranch = `worktree/${name}`;
      if (from) {
        // Base on remote branch
        baseBranch = `origin/${from}`;
        await git.raw(['worktree', 'add', '-b', defaultBranch, worktreePath, baseBranch]);
      } else {
        await git.raw(['worktree', 'add', '-b', defaultBranch, worktreePath]);
      }
    }
  } catch (error) {
    throw new GitCommandError(
      'git worktree add',
      error instanceof Error ? error.message : String(error)
    );
  }

  // Return the new worktree info
  const worktree = await getWorktreeByName(cwd, name);
  if (!worktree) {
    throw new WorktreeNotFoundError(name);
  }

  return { worktree, fetched, baseBranch };
}

/**
 * Remove a worktree.
 */
export async function removeWorktree(options: RemoveWorktreeOptions): Promise<void> {
  const { name, force = false, cwd = process.cwd() } = options;

  validateWorktreeName(name);

  const worktree = await getWorktreeByName(cwd, name);
  if (!worktree) {
    throw new WorktreeNotFoundError(name);
  }

  if (worktree.isMain) {
    throw new GitCommandError('git worktree remove', 'Cannot remove main worktree');
  }

  const mainWorktree = await findMainWorktree(cwd);
  const git = createGit(mainWorktree);

  try {
    const args = ['worktree', 'remove', worktree.path];
    if (force) {
      args.push('--force');
    }
    await git.raw(args);
  } catch (error) {
    throw new GitCommandError(
      'git worktree remove',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Fix detached HEAD state by creating or checking out a branch.
 */
export async function fixDetachedHead(worktreePath: string, worktreeName: string): Promise<string> {
  const git = createGit(worktreePath);
  const currentBranch = await getCurrentBranch(worktreePath);

  // Not detached, nothing to do
  if (currentBranch) {
    return currentBranch;
  }

  const defaultBranch = `worktree/${worktreeName}`;

  // Check if the branch already exists
  if (await branchExists(worktreePath, defaultBranch)) {
    await git.checkout(defaultBranch);
  } else {
    await git.checkoutLocalBranch(defaultBranch);
  }

  return defaultBranch;
}

/**
 * Calculate port offset for a worktree based on its position.
 */
export async function getWorktreePortOffset(cwd: string, name: string): Promise<number> {
  if (name.toLowerCase() === 'main') {
    return 0;
  }

  const mainWorktree = await findMainWorktree(cwd);
  const worktrees = await listWorktrees(cwd);

  let offset = 0;
  for (const wt of worktrees) {
    if (wt.path === mainWorktree) continue;
    offset++;
    if (wt.name === name) {
      return offset;
    }
  }

  return offset;
}
