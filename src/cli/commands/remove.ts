/**
 * wt remove command
 *
 * Removes a worktree after running pre-remove hooks for cleanup.
 */

import { removeWorktree, getWorktreeByName, getWorktreePortOffset } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { executeHookSafe, hasHooks, type HookPayload } from '../../core/hooks.js';
import { printHeader, printSection, printSuccess, printError, printWarning, colors } from '../formatter.js';

type RemoveOptions = {
  force?: boolean;
  noHooks?: boolean;
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
    console.log('Usage: wt remove <name> [--force] [--no-hooks]');
    console.log('');
    console.log('Options:');
    console.log('  --force     Force removal even if there are uncommitted changes');
    console.log('  --no-hooks  Skip running pre-remove hooks');
    process.exit(1);
  }

  const worktree = await getWorktreeByName(cwd, name);
  const mainWorktree = await findMainWorktree(cwd);

  if (worktree) {
    printHeader(`Removing Worktree: ${name}`);
    console.log(`📁 Path: ${worktree.path}`);
    console.log('');

    // Step 1: Execute pre-remove hooks for cleanup
    if (!options.noHooks) {
      printSection('Step 1: Running Cleanup Hooks');

      if (hasHooks(mainWorktree)) {
        const offset = await getWorktreePortOffset(cwd, name);
        const payload: HookPayload = {
          worktreeName: name,
          worktreePath: worktree.path,
          mainWorktreePath: mainWorktree,
          isMain: worktree.isMain,
          portOffset: offset,
        };

        console.log('');
        const result = await executeHookSafe('pre-remove', payload, mainWorktree);
        console.log('');

        if (result.executed && result.exitCode === 0) {
          console.log(`  ${colors.success('✓ Cleanup hooks completed')}`);
        } else if (result.executed) {
          printWarning(`Hook exited with code ${result.exitCode}`);
          if (!options.force) {
            console.log(colors.dim('  Use --force to remove anyway'));
          }
        }
      } else {
        console.log(colors.dim('  No hooks found (scripts/worktree-hooks.sh)'));
      }
    } else {
      printSection('Step 1: Hooks (skipped)');
      console.log(colors.dim('  --no-hooks flag specified'));
    }

    // Step 2: Remove the worktree
    printSection('Step 2: Removing Worktree');
  }

  await removeWorktree({ name, force: options.force, cwd });

  printSuccess(`Worktree '${name}' removed`);
}
