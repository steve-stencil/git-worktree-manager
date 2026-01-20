import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import {
  findGitRoot,
  findMainWorktree,
  getWorktreePaths,
  getRawWorktreeList,
  getCurrentBranch,
  isDetachedHead,
  branchExists,
  getCurrentCommit,
} from '../git.js';
import { NotGitRepoError } from '../errors.js';

describe('git (integration tests)', () => {
  let tempDir: string;
  let repoDir: string;

  beforeEach(async () => {
    // Create a temp directory with a git repo
    const rawTempDir = await mkdtemp(join(tmpdir(), 'wt-git-test-'));
    // Resolve symlinks (macOS /var -> /private/var)
    tempDir = await realpath(rawTempDir);
    repoDir = join(tempDir, 'test-repo');

    // Create the repo directory first
    await mkdir(repoDir, { recursive: true });

    // Initialize a fresh repo
    const git = simpleGit(repoDir);
    await git.init();
    await git.addConfig('user.email', 'test@test.com');
    await git.addConfig('user.name', 'Test User');

    // Create initial commit
    await writeFile(join(repoDir, 'README.md'), '# Test Repo');
    await git.add('.');
    await git.commit('Initial commit');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('findGitRoot', () => {
    it('should find git root from repo directory', async () => {
      const root = await findGitRoot(repoDir);
      expect(root).toBe(repoDir);
    });

    it('should find git root from subdirectory', async () => {
      const subDir = join(repoDir, 'src', 'components');
      await mkdir(subDir, { recursive: true });

      const root = await findGitRoot(subDir);
      expect(root).toBe(repoDir);
    });

    it('should throw NotGitRepoError for non-git directory', async () => {
      await expect(findGitRoot(tempDir)).rejects.toThrow(NotGitRepoError);
    });
  });

  describe('findMainWorktree', () => {
    it('should return main worktree path', async () => {
      const main = await findMainWorktree(repoDir);
      expect(main).toBe(repoDir);
    });
  });

  describe('getWorktreePaths', () => {
    it('should return array with main worktree', async () => {
      const paths = await getWorktreePaths(repoDir);
      expect(paths).toContain(repoDir);
      expect(paths.length).toBe(1);
    });

    it('should return all worktrees when multiple exist', async () => {
      const git = simpleGit(repoDir);

      // Create a new worktree
      const worktreePath = join(tempDir, 'test-repo-feature');
      await git.raw(['worktree', 'add', '-b', 'feature', worktreePath]);

      const paths = await getWorktreePaths(repoDir);
      expect(paths).toContain(repoDir);
      expect(paths).toContain(worktreePath);
      expect(paths.length).toBe(2);
    });
  });

  describe('getRawWorktreeList', () => {
    it('should return detailed worktree info', async () => {
      const list = await getRawWorktreeList(repoDir);

      expect(list.length).toBe(1);
      expect(list[0]?.path).toBe(repoDir);
      expect(list[0]?.branch).toBeDefined();
      expect(list[0]?.head).toBeDefined();
      expect(list[0]?.detached).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const branch = await getCurrentBranch(repoDir);
      // Could be 'main' or 'master' depending on git config
      expect(branch).toMatch(/^(main|master)$/);
    });

    it('should return null for detached HEAD', async () => {
      const git = simpleGit(repoDir);
      const commit = await git.revparse(['HEAD']);

      // Checkout specific commit to create detached HEAD
      await git.checkout(commit.trim());

      const branch = await getCurrentBranch(repoDir);
      expect(branch).toBeNull();
    });
  });

  describe('isDetachedHead', () => {
    it('should return false when on a branch', async () => {
      const detached = await isDetachedHead(repoDir);
      expect(detached).toBe(false);
    });

    it('should return true when in detached HEAD state', async () => {
      const git = simpleGit(repoDir);
      const commit = await git.revparse(['HEAD']);
      await git.checkout(commit.trim());

      const detached = await isDetachedHead(repoDir);
      expect(detached).toBe(true);
    });
  });

  describe('branchExists', () => {
    it('should return true for existing branch', async () => {
      const exists = await branchExists(repoDir, 'main');
      // Try both main and master
      const existsMaster = await branchExists(repoDir, 'master');
      expect(exists || existsMaster).toBe(true);
    });

    it('should return false for non-existent branch', async () => {
      const exists = await branchExists(repoDir, `non-existent-branch-${Date.now()}`);
      expect(exists).toBe(false);
    });
  });

  describe('getCurrentCommit', () => {
    it('should return commit SHA', async () => {
      const sha = await getCurrentCommit(repoDir);
      expect(sha).toMatch(/^[a-f0-9]{40}$/);
    });
  });
});
