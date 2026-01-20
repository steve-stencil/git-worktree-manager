/**
 * wt list command
 */

import { listWorktrees } from '../../core/worktree.js';
import { findMainWorktree, getRepoName } from '../../core/git.js';
import { printHeader, printTip, colors } from '../formatter.js';

/**
 * List all worktrees
 */
export async function listCommand(cwd: string): Promise<void> {
  const mainWorktree = await findMainWorktree(cwd);
  const repoName = getRepoName(mainWorktree);
  const worktrees = await listWorktrees(cwd);

  printHeader(`Git Worktrees for ${repoName}`);

  console.log(colors.bold('Main Project:'));
  console.log(`  📁 ${mainWorktree}`);
  console.log('');

  console.log(colors.bold('Available Worktrees:'));
  console.log('');

  for (const wt of worktrees) {
    if (wt.isMain) {
      console.log(`  ${colors.success('● MAIN')} (${wt.branch})`);
      console.log(`    Path: ${wt.path}`);
    } else {
      const envStatus = wt.hasEnv ? '✅' : '❌';
      const depsStatus = wt.hasDeps ? '✅' : '❌';

      console.log(`  ${colors.warning(`○ ${wt.name}`)}`);
      console.log(`    Branch: ${wt.branch}`);
      console.log(`    Path: ${wt.path}`);
      console.log(`    Env: ${envStatus}  Deps: ${depsStatus}`);
    }
    console.log('');
  }

  printTip("Use 'wt switch <name>' to set up and open a worktree");
}
