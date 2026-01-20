import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { findCursorRules, syncCursorRules } from '../cursor-rules.js';

// Mock the git module
vi.mock('../git.js', () => ({
  isGitIgnored: vi.fn().mockImplementation(async (_cwd: string, path: string) => {
    // Simulate credentials.mdc being gitignored
    return path.includes('credentials.mdc');
  }),
}));

describe('cursor-rules', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wt-cursor-rules-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('findCursorRules', () => {
    it('should return empty array when no rules directory', async () => {
      const result = await findCursorRules(tempDir);
      expect(result).toEqual([]);
    });

    it('should find .mdc files in rules directory', async () => {
      const rulesDir = join(tempDir, '.cursor/rules');
      await mkdir(rulesDir, { recursive: true });
      await writeFile(join(rulesDir, 'style.mdc'), 'content');
      await writeFile(join(rulesDir, 'credentials.mdc'), 'secret');

      const result = await findCursorRules(tempDir);

      expect(result.length).toBe(2);
      expect(result.some((f) => f.endsWith('style.mdc'))).toBe(true);
      expect(result.some((f) => f.endsWith('credentials.mdc'))).toBe(true);
    });

    it('should ignore non-.mdc files', async () => {
      const rulesDir = join(tempDir, '.cursor/rules');
      await mkdir(rulesDir, { recursive: true });
      await writeFile(join(rulesDir, 'style.mdc'), 'content');
      await writeFile(join(rulesDir, 'readme.txt'), 'not a rule');

      const result = await findCursorRules(tempDir);

      expect(result.length).toBe(1);
      expect(result[0]).toContain('style.mdc');
    });
  });

  describe('syncCursorRules', () => {
    it('should not sync when same directory', async () => {
      const result = await syncCursorRules(tempDir, tempDir);

      expect(result.copiedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });

    it('should return zeros when no rules directory', async () => {
      const target = join(tempDir, 'target');
      await mkdir(target);

      const result = await syncCursorRules(tempDir, target);

      expect(result.copiedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });

    it('should copy gitignored files always', async () => {
      const source = join(tempDir, 'source');
      const target = join(tempDir, 'target');

      // Set up source with rules
      const sourceRulesDir = join(source, '.cursor/rules');
      await mkdir(sourceRulesDir, { recursive: true });
      await writeFile(join(sourceRulesDir, 'credentials.mdc'), 'secret');
      await mkdir(target);

      const result = await syncCursorRules(source, target);

      expect(result.copiedCount).toBe(1);
      expect(result.copiedFiles).toContain('credentials.mdc');
      expect(existsSync(join(target, '.cursor/rules/credentials.mdc'))).toBe(true);
    });

    it('should copy non-gitignored files only if not exists', async () => {
      const source = join(tempDir, 'source');
      const target = join(tempDir, 'target');

      // Set up source with rules
      const sourceRulesDir = join(source, '.cursor/rules');
      await mkdir(sourceRulesDir, { recursive: true });
      await writeFile(join(sourceRulesDir, 'style.mdc'), 'source content');

      // Set up target with existing file
      const targetRulesDir = join(target, '.cursor/rules');
      await mkdir(targetRulesDir, { recursive: true });
      await writeFile(join(targetRulesDir, 'style.mdc'), 'existing content');

      const result = await syncCursorRules(source, target);

      expect(result.skippedCount).toBe(1);
      // File should not be overwritten
      const content = await readFile(join(targetRulesDir, 'style.mdc'), 'utf-8');
      expect(content).toBe('existing content');
    });

    it('should copy non-gitignored files if not exists in target', async () => {
      const source = join(tempDir, 'source');
      const target = join(tempDir, 'target');

      const sourceRulesDir = join(source, '.cursor/rules');
      await mkdir(sourceRulesDir, { recursive: true });
      await writeFile(join(sourceRulesDir, 'style.mdc'), 'source content');
      await mkdir(target);

      const result = await syncCursorRules(source, target);

      expect(result.copiedCount).toBe(1);
      expect(existsSync(join(target, '.cursor/rules/style.mdc'))).toBe(true);
    });

    it('should always overwrite gitignored files even if exists', async () => {
      const source = join(tempDir, 'source');
      const target = join(tempDir, 'target');

      // Set up source
      const sourceRulesDir = join(source, '.cursor/rules');
      await mkdir(sourceRulesDir, { recursive: true });
      await writeFile(join(sourceRulesDir, 'credentials.mdc'), 'new secret');

      // Set up target with existing file
      const targetRulesDir = join(target, '.cursor/rules');
      await mkdir(targetRulesDir, { recursive: true });
      await writeFile(join(targetRulesDir, 'credentials.mdc'), 'old secret');

      const result = await syncCursorRules(source, target);

      expect(result.copiedCount).toBe(1);
      const content = await readFile(join(targetRulesDir, 'credentials.mdc'), 'utf-8');
      expect(content).toBe('new secret');
    });
  });
});
