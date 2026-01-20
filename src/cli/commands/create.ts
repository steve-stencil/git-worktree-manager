/**
 * wt create command
 */

import { createWorktree, getWorktreePath } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { printHeader, printSuccess, printError, colors } from '../formatter.js';

/**
 * Create a new worktree
 */
export async function createCommand(
  name: string | undefined,
  branch: string | undefined,
  cwd: string
): Promise<void> {
  if (!name) {
    printError('Please provide a worktree name');
    console.log('');
    console.log('Usage: wt create <name> [branch]');
    console.log('');
    console.log('Arguments:');
    console.log("  name    Short name for the worktree (e.g., 'feature-x', 'bugfix')");
    console.log('  branch  Optional: branch to checkout (default: creates new branch)');
    process.exit(1);
  }

  const mainWorktree = await findMainWorktree(cwd);
  const worktreePath = await getWorktreePath(cwd, name);

  printHeader(`Creating Worktree: ${name}`);

  console.log(`📁 Main project: ${mainWorktree}`);
  console.log(`📁 New worktree: ${worktreePath}`);
  console.log('');

  await createWorktree({ name, branch, cwd });

  console.log('');
  printSuccess('Worktree created!');
  console.log('');
  console.log(colors.bold('Next step - set up and open:'));
  console.log(`  ${colors.cyan(`wt switch ${name}`)}`);
}
