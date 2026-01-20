/**
 * Core git operations using simple-git
 */

import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';
import { NotGitRepoError, wrapError } from './errors.js';

/**
 * Create a simple-git instance for the given directory
 */
export function createGit(cwd: string): SimpleGit {
  const options: Partial<SimpleGitOptions> = {
    baseDir: cwd,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: true,
  };

  return simpleGit(options);
}

/**
 * Find the root directory of the git repository.
 *
 * @param cwd - Working directory to start from
 * @returns Absolute path to the git root
 * @throws NotGitRepoError if not in a git repository
 */
export async function findGitRoot(cwd: string): Promise<string> {
  const git = createGit(cwd);

  try {
    const root = await git.revparse(['--show-toplevel']);
    return root.trim();
  } catch {
    throw new NotGitRepoError(cwd);
  }
}

/**
 * Find the main worktree (first/primary worktree) of the repository.
 *
 * The main worktree is always the first one listed by `git worktree list`.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @returns Absolute path to the main worktree
 */
export async function findMainWorktree(cwd: string): Promise<string> {
  const git = createGit(cwd);

  try {
    const result = await git.raw(['worktree', 'list', '--porcelain']);
    const lines = result.split('\n');

    // First "worktree <path>" line is the main worktree
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        return line.slice('worktree '.length).trim();
      }
    }

    // Fallback to git root if no worktrees found (shouldn't happen)
    return findGitRoot(cwd);
  } catch (error) {
    throw wrapError(error, 'Failed to find main worktree');
  }
}

/**
 * Get all worktree paths for the repository.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @returns Array of absolute paths to all worktrees
 */
export async function getWorktreePaths(cwd: string): Promise<string[]> {
  const git = createGit(cwd);

  try {
    const result = await git.raw(['worktree', 'list', '--porcelain']);
    const paths: string[] = [];

    for (const line of result.split('\n')) {
      if (line.startsWith('worktree ')) {
        paths.push(line.slice('worktree '.length).trim());
      }
    }

    return paths;
  } catch (error) {
    throw wrapError(error, 'Failed to get worktree paths');
  }
}

/**
 * Parsed worktree info from git worktree list --porcelain
 */
export type RawWorktreeInfo = {
  path: string;
  head: string;
  branch: string | null;
  bare: boolean;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
};

/**
 * Get detailed worktree information from git.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @returns Array of parsed worktree info
 */
export async function getRawWorktreeList(cwd: string): Promise<RawWorktreeInfo[]> {
  const git = createGit(cwd);

  try {
    const result = await git.raw(['worktree', 'list', '--porcelain']);
    const worktrees: RawWorktreeInfo[] = [];
    let current: Partial<RawWorktreeInfo> = {};

    for (const line of result.split('\n')) {
      if (line.startsWith('worktree ')) {
        // New worktree entry
        if (current.path) {
          worktrees.push(current as RawWorktreeInfo);
        }
        current = {
          path: line.slice('worktree '.length).trim(),
          head: '',
          branch: null,
          bare: false,
          detached: false,
          locked: false,
          prunable: false,
        };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.slice('HEAD '.length).trim();
      } else if (line.startsWith('branch ')) {
        // Branch format: refs/heads/branch-name
        const fullRef = line.slice('branch '.length).trim();
        current.branch = fullRef.replace('refs/heads/', '');
      } else if (line === 'bare') {
        current.bare = true;
      } else if (line === 'detached') {
        current.detached = true;
      } else if (line.startsWith('locked')) {
        current.locked = true;
      } else if (line.startsWith('prunable')) {
        current.prunable = true;
      }
    }

    // Don't forget the last entry
    if (current.path) {
      worktrees.push(current as RawWorktreeInfo);
    }

    return worktrees;
  } catch (error) {
    throw wrapError(error, 'Failed to list worktrees');
  }
}

/**
 * Get the repository name from the main worktree path.
 *
 * @param mainWorktreePath - Absolute path to the main worktree
 * @returns Repository name (basename of the path)
 */
export function getRepoName(mainWorktreePath: string): string {
  const parts = mainWorktreePath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'unknown';
}

/**
 * Get the parent directory of a path.
 *
 * @param path - Absolute path
 * @returns Parent directory path
 */
export function getParentDir(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

/**
 * Get the current branch name.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @returns Branch name or null if in detached HEAD state
 */
export async function getCurrentBranch(cwd: string): Promise<string | null> {
  const git = createGit(cwd);

  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    const trimmed = branch.trim();

    // "HEAD" means detached state
    if (trimmed === 'HEAD') {
      return null;
    }

    return trimmed;
  } catch (error) {
    throw wrapError(error, 'Failed to get current branch');
  }
}

/**
 * Check if the repository is in detached HEAD state.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @returns true if in detached HEAD state
 */
export async function isDetachedHead(cwd: string): Promise<boolean> {
  const branch = await getCurrentBranch(cwd);
  return branch === null;
}

/**
 * Check if a branch exists.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @param branchName - Name of the branch to check
 * @returns true if the branch exists
 */
export async function branchExists(cwd: string, branchName: string): Promise<boolean> {
  const git = createGit(cwd);

  try {
    const result = await git.raw(['show-ref', '--verify', `refs/heads/${branchName}`]);
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the current commit SHA.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @returns Full commit SHA
 */
export async function getCurrentCommit(cwd: string): Promise<string> {
  const git = createGit(cwd);

  try {
    const sha = await git.revparse(['HEAD']);
    return sha.trim();
  } catch (error) {
    throw wrapError(error, 'Failed to get current commit');
  }
}

/**
 * Check if a file or directory is ignored by git.
 *
 * @param cwd - Working directory (must be in a git repo)
 * @param path - Path to check (relative or absolute)
 * @returns true if the path is ignored
 */
export async function isGitIgnored(cwd: string, path: string): Promise<boolean> {
  const git = createGit(cwd);

  try {
    await git.raw(['check-ignore', '--quiet', path]);
    return true;
  } catch {
    return false;
  }
}
