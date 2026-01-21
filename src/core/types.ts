/**
 * Core type definitions for git-worktree-manager
 */

/**
 * Information about a single git worktree
 */
export type WorktreeInfo = {
  /** Short name of the worktree (e.g., "feature-x") */
  name: string;
  /** Absolute path to the worktree directory */
  path: string;
  /** Branch name (without refs/heads/) */
  branch: string;
  /** Whether this is the main/primary worktree */
  isMain: boolean;
  /** Whether .env files exist in expected locations */
  hasEnv: boolean;
  /** Whether node_modules exists */
  hasDeps: boolean;
  /** Last modification time of the worktree directory */
  lastModified: Date;
  /** Commit SHA the worktree is on */
  commitSha: string;
  /** Whether the worktree is in detached HEAD state */
  isDetached: boolean;
};

/**
 * Configuration loaded from .wtconfig files
 */
export type Config = {
  /** Editor command to open worktrees (default: "cursor") */
  editorCmd: string;
  /** Base port for API servers (default: 4000) */
  baseApiPort: number;
  /** Base port for web servers (default: 5173) */
  baseWebPort: number;
  /** Default base branch for new worktrees (default: undefined, uses current HEAD) */
  baseBranch?: string;
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  editorCmd: 'cursor',
  baseApiPort: 4000,
  baseWebPort: 5173,
  baseBranch: undefined,
};

/**
 * Options for creating a worktree
 */
export type CreateWorktreeOptions = {
  /** Name for the new worktree */
  name: string;
  /** Branch to checkout (optional - creates new branch if not specified) */
  branch?: string;
  /** Create a new branch with this name */
  newBranch?: string;
  /** Base branch to create the new branch from (e.g., "develop") */
  from?: string;
  /** Skip fetching from remote before creating */
  noFetch?: boolean;
  /** Working directory to run from */
  cwd?: string;
};

/**
 * Options for removing a worktree
 */
export type RemoveWorktreeOptions = {
  /** Name of the worktree to remove */
  name: string;
  /** Force removal even if there are uncommitted changes */
  force?: boolean;
  /** Working directory to run from */
  cwd?: string;
};

/**
 * Options for switching to a worktree
 */
export type SwitchWorktreeOptions = {
  /** Name of the worktree to switch to */
  name: string;
  /** Skip opening the editor */
  skipEditor?: boolean;
  /** Skip installing dependencies */
  skipDeps?: boolean;
  /** Skip environment file setup */
  skipEnv?: boolean;
  /** Working directory to run from */
  cwd?: string;
};

/**
 * Port allocation result
 */
export type PortAllocation = {
  /** Port for API server */
  apiPort: number;
  /** Port for web server */
  webPort: number;
  /** Offset from base ports (0 for main, 1+ for worktrees) */
  offset: number;
};

/**
 * Environment file type
 */
export type EnvFileType = 'api' | 'web' | 'root';

/**
 * Environment file location info
 */
export type EnvFileInfo = {
  /** Relative path from worktree root */
  relativePath: string;
  /** Absolute path */
  absolutePath: string;
  /** Type of env file */
  type: EnvFileType;
  /** Whether the file exists */
  exists: boolean;
};

/**
 * Result of syncing cursor rules
 */
export type CursorRulesSyncResult = {
  /** Number of files copied */
  copiedCount: number;
  /** Number of files skipped (already exist) */
  skippedCount: number;
  /** Files that were copied */
  copiedFiles: string[];
};

// Type guards

/**
 * Check if a value is a valid WorktreeInfo object
 */
export function isWorktreeInfo(value: unknown): value is WorktreeInfo {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.path === 'string' &&
    typeof obj.branch === 'string' &&
    typeof obj.isMain === 'boolean' &&
    typeof obj.hasEnv === 'boolean' &&
    typeof obj.hasDeps === 'boolean' &&
    obj.lastModified instanceof Date &&
    typeof obj.commitSha === 'string' &&
    typeof obj.isDetached === 'boolean'
  );
}

/**
 * Check if a value is a valid Config object
 */
export function isConfig(value: unknown): value is Config {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.editorCmd === 'string' &&
    typeof obj.baseApiPort === 'number' &&
    typeof obj.baseWebPort === 'number' &&
    (obj.baseBranch === undefined || typeof obj.baseBranch === 'string')
  );
}
