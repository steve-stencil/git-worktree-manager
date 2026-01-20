/**
 * Error classes for git-worktree-manager
 */

/**
 * Error codes for categorizing errors
 */
export type WorktreeErrorCode =
  | 'NOT_GIT_REPO'
  | 'WORKTREE_NOT_FOUND'
  | 'WORKTREE_EXISTS'
  | 'BRANCH_NOT_FOUND'
  | 'BRANCH_IN_USE'
  | 'CONFIG_PARSE_ERROR'
  | 'GIT_COMMAND_FAILED'
  | 'ENV_COPY_FAILED'
  | 'INVALID_WORKTREE_NAME'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * Base error class for all worktree-related errors
 */
export class WorktreeError extends Error {
  readonly code: WorktreeErrorCode;
  readonly cause?: Error;

  constructor(code: WorktreeErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = 'WorktreeError';
    this.code = code;
    this.cause = cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorktreeError);
    }
  }

  /**
   * Create a JSON-serializable representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
    };
  }
}

/**
 * Thrown when not in a git repository
 */
export class NotGitRepoError extends WorktreeError {
  constructor(path: string) {
    super('NOT_GIT_REPO', `Not a git repository: ${path}`);
    this.name = 'NotGitRepoError';
  }
}

/**
 * Thrown when a worktree cannot be found
 */
export class WorktreeNotFoundError extends WorktreeError {
  readonly worktreeName: string;

  constructor(name: string) {
    super('WORKTREE_NOT_FOUND', `Worktree not found: ${name}`);
    this.name = 'WorktreeNotFoundError';
    this.worktreeName = name;
  }
}

/**
 * Thrown when a worktree already exists
 */
export class WorktreeExistsError extends WorktreeError {
  readonly worktreePath: string;

  constructor(path: string) {
    super('WORKTREE_EXISTS', `Worktree already exists: ${path}`);
    this.name = 'WorktreeExistsError';
    this.worktreePath = path;
  }
}

/**
 * Thrown when a branch cannot be found
 */
export class BranchNotFoundError extends WorktreeError {
  readonly branchName: string;

  constructor(branch: string) {
    super('BRANCH_NOT_FOUND', `Branch not found: ${branch}`);
    this.name = 'BranchNotFoundError';
    this.branchName = branch;
  }
}

/**
 * Thrown when a branch is already in use by another worktree
 */
export class BranchInUseError extends WorktreeError {
  readonly branchName: string;
  readonly worktreePath: string;

  constructor(branch: string, worktreePath: string) {
    super('BRANCH_IN_USE', `Branch '${branch}' is already checked out in: ${worktreePath}`);
    this.name = 'BranchInUseError';
    this.branchName = branch;
    this.worktreePath = worktreePath;
  }
}

/**
 * Thrown when config file parsing fails
 */
export class ConfigParseError extends WorktreeError {
  readonly configPath: string;

  constructor(path: string, cause?: Error) {
    super('CONFIG_PARSE_ERROR', `Failed to parse config file: ${path}`, cause);
    this.name = 'ConfigParseError';
    this.configPath = path;
  }
}

/**
 * Thrown when a git command fails
 */
export class GitCommandError extends WorktreeError {
  readonly command: string;

  constructor(command: string, message: string, cause?: Error) {
    super('GIT_COMMAND_FAILED', `Git command failed: ${message}`, cause);
    this.name = 'GitCommandError';
    this.command = command;
  }
}

/**
 * Thrown when environment file operations fail
 */
export class EnvCopyError extends WorktreeError {
  readonly sourcePath: string;
  readonly targetPath: string;

  constructor(source: string, target: string, cause?: Error) {
    super('ENV_COPY_FAILED', `Failed to copy env file from ${source} to ${target}`, cause);
    this.name = 'EnvCopyError';
    this.sourcePath = source;
    this.targetPath = target;
  }
}

/**
 * Thrown when worktree name is invalid
 */
export class InvalidWorktreeNameError extends WorktreeError {
  readonly invalidName: string;

  constructor(name: string, reason: string) {
    super('INVALID_WORKTREE_NAME', `Invalid worktree name '${name}': ${reason}`);
    this.name = 'InvalidWorktreeNameError';
    this.invalidName = name;
  }
}

/**
 * Type guard for WorktreeError
 */
export function isWorktreeError(error: unknown): error is WorktreeError {
  return error instanceof WorktreeError;
}

/**
 * Wrap unknown errors in WorktreeError
 */
export function wrapError(error: unknown, context: string): WorktreeError {
  if (error instanceof WorktreeError) {
    return error;
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  return new WorktreeError('UNKNOWN_ERROR', `${context}: ${cause.message}`, cause);
}
