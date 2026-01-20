/**
 * wt remove command
 */

import { removeWorktree, getWorktreeByName } from '../../core/worktree.js';
import { printHeader, printSuccess, printError } from '../formatter.js';

type RemoveOptions = {
  force?: boolean;
};

/**
 * Remove a worktree
 */
export async function removeCommand(
  name: string | undefined,
  options: RemoveOptions,
  cwd: string
): Promise<void> {
  if (!name) {
    printError('Please provide a worktree name');
    console.log('');
    console.log('Usage: wt remove <name> [--force]');
    process.exit(1);
  }

  const worktree = await getWorktreeByName(cwd, name);
  if (worktree) {
    printHeader(`Removing Worktree: ${name}`);
    console.log(`📁 Path: ${worktree.path}`);
    console.log('');
  }

  await removeWorktree({ name, force: options.force, cwd });

  printSuccess(`Worktree '${name}' removed`);
}
