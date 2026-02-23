/**
 * wt create command
 *
 * Creates a new worktree and optionally runs post-create hooks.
 */

import { createWorktree, getWorktreePath, getWorktreePortOffset } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { loadConfig } from '../../core/config.js';
import { executeHookSafe, hasHooks, type HookPayload } from '../../core/hooks.js';
import { printHeader, printSection, printSuccess, printError, printWarning, colors } from '../formatter.js';

type CreateOptions = {
  noHooks?: boolean;
  from?: string;
  branch?: string;
  noFetch?: boolean;
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
    console.log('Usage: wt create <name> [branch] [options]');
    console.log('');
    console.log('Arguments:');
    console.log("  name    Short name for the worktree (e.g., 'feature-x', 'bugfix')");
    console.log('  branch  Optional: branch to checkout (default: creates new branch)');
    console.log('');
    console.log('Options:');
    console.log('  --from <branch>    Base branch to create from (e.g., --from develop)');
    console.log('  --branch <name>    Explicit new branch name (e.g., feature/issue-42-my-feature)');
    console.log('  --no-fetch         Skip fetching from remote before creating');
    console.log('  --no-hooks         Skip running post-create hooks');
    console.log('');
    console.log('Config:');
    console.log('  Set BASE_BRANCH=develop in .wtconfig to always use develop as the base');
    process.exit(1);
  }

  const mainWorktree = await findMainWorktree(cwd);
  const worktreePath = await getWorktreePath(cwd, name);
  const config = await loadConfig(mainWorktree);

  // Determine base branch: CLI option > config > undefined (use current HEAD)
  const baseBranch = options.from ?? config.baseBranch;

  printHeader(`Creating Worktree: ${name}`);

  console.log(`📁 Main project: ${mainWorktree}`);
  console.log(`📁 New worktree: ${worktreePath}`);
  if (options.branch) {
    console.log(`🌿 New branch: ${options.branch}`);
  }
  if (baseBranch) {
    console.log(`🌿 Base branch: origin/${baseBranch}`);
  }
  console.log('');

  // Step 1: Create the worktree
  printSection('Step 1: Creating Worktree');

  const result = await createWorktree({
    name,
    branch,
    newBranch: options.branch,
    from: baseBranch,
    noFetch: options.noFetch,
    cwd,
  });

  if (result.fetched) {
    console.log(`  ${colors.success('✓ Fetched latest from remote')}`);
  }
  console.log(`  ${colors.success(`✓ Worktree created at ${result.worktree.path}`)}`);
  console.log(`  ${colors.success(`✓ Branch: ${result.worktree.branch}`)}`);
  if (options.branch) {
    console.log(`  ${colors.success(`✓ Custom branch name applied`)}`);
  }
  if (result.baseBranch) {
    console.log(`  ${colors.success(`✓ Based on: ${result.baseBranch}`)}`);
  }

  // Step 2: Execute repo-specific hooks
  if (!options.noHooks) {
    printSection('Step 2: Running Repo Hooks');

    if (hasHooks(mainWorktree)) {
      const offset = await getWorktreePortOffset(cwd, name);
      const payload: HookPayload = {
        worktreeName: name,
        worktreePath: result.worktree.path,
        mainWorktreePath: mainWorktree,
        isMain: false,
        portOffset: offset,
      };

      console.log('');
      const hookResult = await executeHookSafe('post-create', payload, mainWorktree);
      console.log('');

      if (hookResult.executed && hookResult.exitCode === 0) {
        console.log(`  ${colors.success('✓ Hooks completed successfully')}`);
      } else if (hookResult.executed) {
        printWarning(`Hook exited with code ${hookResult.exitCode}`);
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
