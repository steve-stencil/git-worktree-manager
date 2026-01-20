/**
 * wt create command
 *
 * Creates a new worktree and optionally runs post-create hooks.
 */

import { createWorktree, getWorktreePath, getWorktreePortOffset } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { executeHookSafe, hasHooks, type HookPayload } from '../../core/hooks.js';
import { printHeader, printSection, printSuccess, printError, printWarning, colors } from '../formatter.js';

type CreateOptions = {
  noHooks?: boolean;
};

/**
 * Create a new worktree
 */
export async function createCommand(
  name: string | undefined,
  branch: string | undefined,
  options: CreateOptions,
  cwd: string
): Promise<void> {
  if (!name) {
    printError('Please provide a worktree name');
    console.log('');
    console.log('Usage: wt create <name> [branch] [--no-hooks]');
    console.log('');
    console.log('Arguments:');
    console.log("  name    Short name for the worktree (e.g., 'feature-x', 'bugfix')");
    console.log('  branch  Optional: branch to checkout (default: creates new branch)');
    console.log('');
    console.log('Options:');
    console.log('  --no-hooks  Skip running post-create hooks');
    process.exit(1);
  }

  const mainWorktree = await findMainWorktree(cwd);
  const worktreePath = await getWorktreePath(cwd, name);

  printHeader(`Creating Worktree: ${name}`);

  console.log(`📁 Main project: ${mainWorktree}`);
  console.log(`📁 New worktree: ${worktreePath}`);
  console.log('');

  // Step 1: Create the worktree
  printSection('Step 1: Creating Worktree');
  const worktree = await createWorktree({ name, branch, cwd });
  console.log(`  ${colors.success(`✓ Worktree created at ${worktree.path}`)}`);
  console.log(`  ${colors.success(`✓ Branch: ${worktree.branch}`)}`);

  // Step 2: Execute repo-specific hooks
  if (!options.noHooks) {
    printSection('Step 2: Running Repo Hooks');

    if (hasHooks(mainWorktree)) {
      const offset = await getWorktreePortOffset(cwd, name);
      const payload: HookPayload = {
        worktreeName: name,
        worktreePath: worktree.path,
        mainWorktreePath: mainWorktree,
        isMain: false,
        portOffset: offset,
      };

      console.log('');
      const result = await executeHookSafe('post-create', payload, mainWorktree);
      console.log('');

      if (result.executed && result.exitCode === 0) {
        console.log(`  ${colors.success('✓ Hooks completed successfully')}`);
      } else if (result.executed) {
        printWarning(`Hook exited with code ${result.exitCode}`);
      }
    } else {
      console.log(colors.dim('  No hooks found (scripts/worktree-hooks.sh)'));
    }
  } else {
    printSection('Step 2: Hooks (skipped)');
    console.log(colors.dim('  --no-hooks flag specified'));
  }

  console.log('');
  printSuccess('Worktree created!');
  console.log('');
  console.log(colors.bold('Next step - open in editor:'));
  console.log(`  ${colors.cyan(`wt switch ${name}`)}`);
}
