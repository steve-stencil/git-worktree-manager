import { describe, it, expect } from 'vitest';
import {
  WorktreeError,
  NotGitRepoError,
  WorktreeNotFoundError,
  WorktreeExistsError,
  BranchNotFoundError,
  BranchInUseError,
  ConfigParseError,
  GitCommandError,
  EnvCopyError,
  InvalidWorktreeNameError,
  isWorktreeError,
  wrapError,
} from '../errors.js';

describe('errors', () => {
  describe('WorktreeError', () => {
    it('should create error with code and message', () => {
      const error = new WorktreeError('NOT_GIT_REPO', 'Test message');
      expect(error.code).toBe('NOT_GIT_REPO');
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('WorktreeError');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new WorktreeError('UNKNOWN_ERROR', 'Wrapped', cause);
      expect(error.cause).toBe(cause);
    });

    it('should serialize to JSON correctly', () => {
      const error = new WorktreeError('NOT_GIT_REPO', 'Test');
      const json = error.toJSON();
      expect(json.code).toBe('NOT_GIT_REPO');
      expect(json.message).toBe('Test');
      expect(json.name).toBe('WorktreeError');
    });
  });

  describe('NotGitRepoError', () => {
    it('should have correct code and include path', () => {
      const error = new NotGitRepoError('/some/path');
      expect(error.code).toBe('NOT_GIT_REPO');
      expect(error.message).toContain('/some/path');
      expect(error.name).toBe('NotGitRepoError');
    });
  });

  describe('WorktreeNotFoundError', () => {
    it('should have correct code and include name', () => {
      const error = new WorktreeNotFoundError('feature-x');
      expect(error.code).toBe('WORKTREE_NOT_FOUND');
      expect(error.worktreeName).toBe('feature-x');
      expect(error.message).toContain('feature-x');
    });
  });

  describe('WorktreeExistsError', () => {
    it('should have correct code and include path', () => {
      const error = new WorktreeExistsError('/path/to/worktree');
      expect(error.code).toBe('WORKTREE_EXISTS');
      expect(error.worktreePath).toBe('/path/to/worktree');
    });
  });

  describe('BranchNotFoundError', () => {
    it('should have correct code and include branch', () => {
      const error = new BranchNotFoundError('main');
      expect(error.code).toBe('BRANCH_NOT_FOUND');
      expect(error.branchName).toBe('main');
    });
  });

  describe('BranchInUseError', () => {
    it('should have correct code and include branch and path', () => {
      const error = new BranchInUseError('main', '/path/to/worktree');
      expect(error.code).toBe('BRANCH_IN_USE');
      expect(error.branchName).toBe('main');
      expect(error.worktreePath).toBe('/path/to/worktree');
    });
  });

  describe('ConfigParseError', () => {
    it('should have correct code and include path', () => {
      const error = new ConfigParseError('/home/user/.wtconfig');
      expect(error.code).toBe('CONFIG_PARSE_ERROR');
      expect(error.configPath).toBe('/home/user/.wtconfig');
    });

    it('should include cause when provided', () => {
      const cause = new SyntaxError('Invalid syntax');
      const error = new ConfigParseError('/config', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('GitCommandError', () => {
    it('should have correct code and include command', () => {
      const error = new GitCommandError('git worktree add', 'Failed');
      expect(error.code).toBe('GIT_COMMAND_FAILED');
      expect(error.command).toBe('git worktree add');
    });
  });

  describe('EnvCopyError', () => {
    it('should have correct code and include paths', () => {
      const error = new EnvCopyError('/source/.env', '/target/.env');
      expect(error.code).toBe('ENV_COPY_FAILED');
      expect(error.sourcePath).toBe('/source/.env');
      expect(error.targetPath).toBe('/target/.env');
    });
  });

  describe('InvalidWorktreeNameError', () => {
    it('should have correct code and include name', () => {
      const error = new InvalidWorktreeNameError('bad/name', 'contains slash');
      expect(error.code).toBe('INVALID_WORKTREE_NAME');
      expect(error.invalidName).toBe('bad/name');
      expect(error.message).toContain('contains slash');
    });
  });

  describe('isWorktreeError', () => {
    it('should return true for WorktreeError', () => {
      expect(isWorktreeError(new WorktreeError('NOT_GIT_REPO', 'test'))).toBe(true);
    });

    it('should return true for subclasses', () => {
      expect(isWorktreeError(new NotGitRepoError('/path'))).toBe(true);
      expect(isWorktreeError(new WorktreeNotFoundError('test'))).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isWorktreeError(new Error('test'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isWorktreeError('error')).toBe(false);
      expect(isWorktreeError(null)).toBe(false);
    });
  });

  describe('wrapError', () => {
    it('should return WorktreeError unchanged', () => {
      const original = new NotGitRepoError('/path');
      expect(wrapError(original, 'context')).toBe(original);
    });

    it('should wrap regular Error', () => {
      const original = new Error('Original message');
      const wrapped = wrapError(original, 'Operation failed');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.message).toContain('Operation failed');
      expect(wrapped.message).toContain('Original message');
      expect(wrapped.cause).toBe(original);
    });

    it('should wrap string errors', () => {
      const wrapped = wrapError('Something went wrong', 'Context');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.message).toContain('Something went wrong');
    });
  });
});
