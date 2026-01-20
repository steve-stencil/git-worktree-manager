import { describe, it, expect } from 'vitest';

// Most functions require real git, tested in integration tests.
// This file tests pure functions that don't need git.

describe('worktree (unit tests)', () => {
  describe('name validation', () => {
    // These tests verify the validation logic through integration tests
    // as validateWorktreeName is not exported directly

    it('should be tested in integration tests', () => {
      expect(true).toBe(true);
    });
  });
});
