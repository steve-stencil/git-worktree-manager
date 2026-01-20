import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { simpleGit } from 'simple-git';
import {
  listWorktrees,
  getWorktreeByName,
  createWorktree,
  removeWorktree,
  fixDetachedHead,
  getWorktreePath,
} from '../worktree.js';
import {
  WorktreeExistsError,
  WorktreeNotFoundError,
  InvalidWorktreeNameError,
} from '../errors.js';

describe('worktree (integration tests)', () => {
  let tempDir: string;
  let repoDir: string;

  beforeEach(async () => {
    const rawTempDir = await mkdtemp(join(tmpdir(), 'wt-worktree-test-'));
    tempDir = await realpath(rawTempDir);
    repoDir = join(tempDir, 'test-repo');

    await mkdir(repoDir, { recursive: true });

    const git = simpleGit(repoDir);
    await git.init();
    await git.addConfig('user.email', 'test@test.com');
    await git.addConfig('user.name', 'Test User');

    await writeFile(join(repoDir, 'README.md'), '# Test Repo');
    await git.add('.');
    await git.commit('Initial commit');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('listWorktrees', () => {
    it('should list main worktree', async () => {
      const worktrees = await listWorktrees(repoDir);

      expect(worktrees.length).toBe(1);
      expect(worktrees[0]?.isMain).toBe(true);
      expect(worktrees[0]?.name).toBe('main');
      expect(worktrees[0]?.path).toBe(repoDir);
    });

    it('should list multiple worktrees', async () => {
      await createWorktree({ name: 'feature', cwd: repoDir });

      const worktrees = await listWorktrees(repoDir);

      expect(worktrees.length).toBe(2);
      expect(worktrees.find((w) => w.name === 'main')).toBeDefined();
      expect(worktrees.find((w) => w.name === 'feature')).toBeDefined();
    });
  });

  describe('getWorktreeByName', () => {
    it('should find main worktree', async () => {
      const worktree = await getWorktreeByName(repoDir, 'main');

      expect(worktree).not.toBeNull();
      expect(worktree?.isMain).toBe(true);
    });

    it('should find worktree by name', async () => {
      await createWorktree({ name: 'feature', cwd: repoDir });

      const worktree = await getWorktreeByName(repoDir, 'feature');

      expect(worktree).not.toBeNull();
      expect(worktree?.name).toBe('feature');
    });

    it('should return null for non-existent worktree', async () => {
      const worktree = await getWorktreeByName(repoDir, 'non-existent');
      expect(worktree).toBeNull();
    });
  });

  describe('getWorktreePath', () => {
    it('should return correct path for new worktree', async () => {
      const path = await getWorktreePath(repoDir, 'feature');
      expect(path).toBe(join(tempDir, 'test-repo-feature'));
    });
  });

  describe('createWorktree', () => {
    it('should create worktree with default branch', async () => {
      const worktree = await createWorktree({ name: 'feature', cwd: repoDir });

      expect(worktree.name).toBe('feature');
      expect(worktree.branch).toBe('worktree/feature');
      expect(existsSync(worktree.path)).toBe(true);
    });

    it('should create worktree with custom new branch', async () => {
      const worktree = await createWorktree({
        name: 'feature',
        newBranch: 'feat/custom',
        cwd: repoDir,
      });

      expect(worktree.branch).toBe('feat/custom');
    });

    it('should throw WorktreeExistsError for duplicate', async () => {
      await createWorktree({ name: 'feature', cwd: repoDir });

      await expect(createWorktree({ name: 'feature', cwd: repoDir })).rejects.toThrow(
        WorktreeExistsError
      );
    });

    it('should throw InvalidWorktreeNameError for empty name', async () => {
      await expect(createWorktree({ name: '', cwd: repoDir })).rejects.toThrow(
        InvalidWorktreeNameError
      );
    });

    it('should throw InvalidWorktreeNameError for name with slash', async () => {
      await expect(createWorktree({ name: 'feat/ure', cwd: repoDir })).rejects.toThrow(
        InvalidWorktreeNameError
      );
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree', async () => {
      const worktree = await createWorktree({ name: 'feature', cwd: repoDir });
      const path = worktree.path;

      await removeWorktree({ name: 'feature', cwd: repoDir });

      expect(existsSync(path)).toBe(false);
    });

    it('should throw WorktreeNotFoundError for non-existent', async () => {
      await expect(removeWorktree({ name: 'non-existent', cwd: repoDir })).rejects.toThrow(
        WorktreeNotFoundError
      );
    });
  });

  describe('fixDetachedHead', () => {
    it('should do nothing if not detached', async () => {
      const branch = await fixDetachedHead(repoDir, 'main');
      expect(branch).toMatch(/^(main|master)$/);
    });

    it('should create branch if detached', async () => {
      const worktree = await createWorktree({ name: 'feature', cwd: repoDir });
      const git = simpleGit(worktree.path);

      // Create detached HEAD
      const commit = await git.revparse(['HEAD']);
      await git.checkout(commit.trim());

      const branch = await fixDetachedHead(worktree.path, 'feature');
      expect(branch).toBe('worktree/feature');
    });
  });
});
