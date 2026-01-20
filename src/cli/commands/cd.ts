/**
 * wt cd command
 */

import { getWorktreeByName } from '../../core/worktree.js';
import { WorktreeNotFoundError } from '../../core/errors.js';

/**
 * Print path to worktree (for use with shell cd)
 */
export async function cdCommand(name: string | undefined, cwd: string): Promise<void> {
  if (!name) {
    console.error('Error: Please provide a worktree name');
    console.error('Usage: cd $(wt cd <name>)');
    process.exit(1);
  }

  const worktree = await getWorktreeByName(cwd, name);
  if (!worktree) {
    throw new WorktreeNotFoundError(name);
  }

  // Just print the path - the shell will use it with cd
  console.log(worktree.path);
}
