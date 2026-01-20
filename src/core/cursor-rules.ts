/**
 * Cursor rules syncing between worktrees
 *
 * Syncs .cursor/rules/*.mdc files from main worktree to other worktrees.
 * Especially important for gitignored files like credentials.mdc.
 */

import { existsSync } from 'node:fs';
import { readdir, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { type CursorRulesSyncResult } from './types.js';
import { isGitIgnored } from './git.js';

const CURSOR_RULES_DIR = '.cursor/rules';
const RULE_FILE_EXTENSION = '.mdc';

/**
 * Find all cursor rule files in a worktree.
 */
export async function findCursorRules(worktreePath: string): Promise<string[]> {
  const rulesDir = join(worktreePath, CURSOR_RULES_DIR);

  if (!existsSync(rulesDir)) {
    return [];
  }

  try {
    const files = await readdir(rulesDir);
    return files.filter((f) => f.endsWith(RULE_FILE_EXTENSION)).map((f) => join(rulesDir, f));
  } catch {
    return [];
  }
}

/**
 * Check if a cursor rule file is gitignored.
 */
export async function isRuleGitignored(worktreePath: string, rulePath: string): Promise<boolean> {
  return isGitIgnored(worktreePath, rulePath);
}

/**
 * Sync cursor rules from main worktree to target worktree.
 *
 * Rules:
 * - Gitignored files are ALWAYS copied (they won't sync via git)
 * - Non-gitignored files are only copied if they don't exist in target
 */
export async function syncCursorRules(
  mainWorktreePath: string,
  targetWorktreePath: string
): Promise<CursorRulesSyncResult> {
  // Don't sync to self
  if (mainWorktreePath === targetWorktreePath) {
    return { copiedCount: 0, skippedCount: 0, copiedFiles: [] };
  }

  const sourceRulesDir = join(mainWorktreePath, CURSOR_RULES_DIR);
  const targetRulesDir = join(targetWorktreePath, CURSOR_RULES_DIR);

  // No rules to sync
  if (!existsSync(sourceRulesDir)) {
    return { copiedCount: 0, skippedCount: 0, copiedFiles: [] };
  }

  const ruleFiles = await findCursorRules(mainWorktreePath);

  if (ruleFiles.length === 0) {
    return { copiedCount: 0, skippedCount: 0, copiedFiles: [] };
  }

  // Ensure target directory exists
  await mkdir(targetRulesDir, { recursive: true });

  let copiedCount = 0;
  let skippedCount = 0;
  const copiedFiles: string[] = [];

  for (const sourceFile of ruleFiles) {
    const fileName = sourceFile.split('/').pop() ?? '';
    const targetFile = join(targetRulesDir, fileName);

    const isIgnored = await isRuleGitignored(mainWorktreePath, sourceFile);
    const targetExists = existsSync(targetFile);

    // Always copy gitignored files, only copy non-gitignored if target doesn't exist
    if (isIgnored || !targetExists) {
      await copyFile(sourceFile, targetFile);
      copiedCount++;
      copiedFiles.push(fileName);
    } else {
      skippedCount++;
    }
  }

  return { copiedCount, skippedCount, copiedFiles };
}
