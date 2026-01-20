/**
 * wt status command
 */

import { listWorktrees } from '../../core/worktree.js';
import { findMainWorktree, getRepoName } from '../../core/git.js';
import { printHeader, formatRow } from '../formatter.js';

/**
 * Show detailed status table
 */
export async function statusCommand(cwd: string): Promise<void> {
  const mainWorktree = await findMainWorktree(cwd);
  const repoName = getRepoName(mainWorktree);
  const worktrees = await listWorktrees(cwd);

  printHeader(`Worktree Status Overview for ${repoName}`);

  const widths = [15, 25, 6, 6, 20];
  const headers = ['NAME', 'BRANCH', 'ENV', 'DEPS', 'LAST MODIFIED'];

  console.log(formatRow(headers, widths));
  console.log(formatRow(headers.map((h) => '─'.repeat(h.length)), widths));

  for (const wt of worktrees) {
    const name = wt.isMain ? 'MAIN' : wt.name;
    const env = wt.hasEnv ? '✅' : '❌';
    const deps = wt.hasDeps ? '✅' : '❌';
    const modified = wt.lastModified.toISOString().split('T')[0] ?? 'unknown';

    console.log(
      formatRow([name.slice(0, 14), wt.branch.slice(0, 24), env, deps, modified], widths)
    );
  }
}
