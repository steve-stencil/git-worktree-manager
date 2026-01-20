import { describe, it, expect } from 'vitest';
import { getRepoName, getParentDir } from '../git.js';

// Note: Most git functions require real git repos, tested in integration tests.
// This file tests pure functions that don't need git.

describe('git (unit tests)', () => {
  describe('getRepoName', () => {
    it('should extract repo name from path', () => {
      expect(getRepoName('/Users/user/projects/my-repo')).toBe('my-repo');
    });

    it('should handle paths with trailing slash', () => {
      expect(getRepoName('/Users/user/projects/my-repo/')).toBe('my-repo');
    });

    it('should handle root path', () => {
      expect(getRepoName('/')).toBe('unknown');
    });

    it('should handle single directory', () => {
      expect(getRepoName('/repo')).toBe('repo');
    });
  });

  describe('getParentDir', () => {
    it('should return parent directory', () => {
      expect(getParentDir('/Users/user/projects/my-repo')).toBe('/Users/user/projects');
    });

    it('should handle paths with trailing slash', () => {
      expect(getParentDir('/Users/user/projects/my-repo/')).toBe('/Users/user/projects');
    });

    it('should handle single directory', () => {
      expect(getParentDir('/repo')).toBe('/');
    });
  });
});
