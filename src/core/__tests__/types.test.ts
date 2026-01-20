import { describe, it, expect } from 'vitest';
import {
  type WorktreeInfo,
  type Config,
  DEFAULT_CONFIG,
  isWorktreeInfo,
  isConfig,
} from '../types.js';

describe('types', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CONFIG.editorCmd).toBe('cursor');
      expect(DEFAULT_CONFIG.baseApiPort).toBe(4000);
      expect(DEFAULT_CONFIG.baseWebPort).toBe(5173);
    });
  });

  describe('isWorktreeInfo', () => {
    const validWorktree: WorktreeInfo = {
      name: 'feature-x',
      path: '/path/to/worktree',
      branch: 'feature-x',
      isMain: false,
      hasEnv: true,
      hasDeps: true,
      lastModified: new Date(),
      commitSha: 'abc123',
      isDetached: false,
    };

    it('should return true for valid WorktreeInfo', () => {
      expect(isWorktreeInfo(validWorktree)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isWorktreeInfo(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isWorktreeInfo(undefined)).toBe(false);
    });

    it('should return false for missing properties', () => {
      const incomplete = { name: 'test', path: '/test' };
      expect(isWorktreeInfo(incomplete)).toBe(false);
    });

    it('should return false for wrong property types', () => {
      const wrongTypes = { ...validWorktree, isMain: 'yes' };
      expect(isWorktreeInfo(wrongTypes)).toBe(false);
    });

    it('should return false for invalid lastModified', () => {
      const invalidDate = { ...validWorktree, lastModified: '2024-01-01' };
      expect(isWorktreeInfo(invalidDate)).toBe(false);
    });
  });

  describe('isConfig', () => {
    it('should return true for valid Config', () => {
      expect(isConfig(DEFAULT_CONFIG)).toBe(true);
    });

    it('should return true for custom Config', () => {
      const config: Config = {
        editorCmd: 'code',
        baseApiPort: 3000,
        baseWebPort: 8080,
      };
      expect(isConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isConfig(null)).toBe(false);
    });

    it('should return false for missing properties', () => {
      expect(isConfig({ editorCmd: 'code' })).toBe(false);
    });

    it('should return false for wrong types', () => {
      expect(isConfig({ editorCmd: 'code', baseApiPort: '3000', baseWebPort: 8080 })).toBe(false);
    });
  });
});
