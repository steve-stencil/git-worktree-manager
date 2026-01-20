/**
 * wt switch command
 *
 * Switches to a worktree by:
 * 1. Fixing detached HEAD state if needed
 * 2. Executing repo-specific hooks (post-switch)
 * 3. Opening the editor
 *
 * All repo-specific setup (env files, deps, etc.) is handled by hooks.
 */

import { spawn } from 'node:child_process';
import { getWorktreeByName, fixDetachedHead, getWorktreePortOffset } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { loadConfig } from '../../core/config.js';
import { executeHookSafe, hasHooks, type HookPayload } from '../../core/hooks.js';
import { printHeader, printSection, printWarning, printError, colors } from '../formatter.js';
import { WorktreeNotFoundError } from '../../core/errors.js';

type SwitchOptions = {
  noEditor?: boolean;
  noHooks?: boolean;
};

/**
 * Switch to and set up a worktree
 */
export async function switchCommand(
  name: string | undefined,
  options: SwitchOptions,
  cwd: string
): Promise<void> {
  if (!name) {
    printError('Please provide a worktree name');
    console.log('');
    console.log('Usage: wt switch <name> [--no-editor] [--no-hooks]');
    process.exit(1);
  }

  const worktree = await getWorktreeByName(cwd, name);
  if (!worktree) {
    throw new WorktreeNotFoundError(name);
  }

  const mainWorktree = await findMainWorktree(cwd);
  const config = await loadConfig(mainWorktree);

  printHeader(`Setting Up Worktree: ${name}`);
  console.log(`📂 Target: ${worktree.path}`);
  console.log('');

  // Step 1: Fix detached HEAD
  printSection('Step 1: Checking Git Branch State');
  if (worktree.isDetached) {
    printWarning('Worktree is in detached HEAD state');
    const branch = await fixDetachedHead(worktree.path, name);
    console.log(`  ${colors.success(`✓ Now on branch: ${branch}`)}`);
  } else {
    console.log(`  ${colors.success(`✓ Already on branch: ${worktree.branch}`)}`);
  }

  // Step 2: Execute repo-specific hooks
  if (!options.noHooks) {
    printSection('Step 2: Running Repo Hooks');

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
      const result = await executeHookSafe('post-switch', payload, mainWorktree);
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

  // Step 3: Open editor
  if (!options.noEditor) {
    printSection('Step 3: Opening Editor');
    const success = await openEditor(config.editorCmd, worktree.path);
    if (success) {
      console.log(`  ${colors.success(`✓ Opened in ${config.editorCmd}`)}`);
    } else {
      printWarning(`Editor '${config.editorCmd}' not found`);
      console.log(colors.dim(`  Set EDITOR_CMD in ~/.wtconfig or install ${config.editorCmd}`));
    }
  }

  // Done!
  console.log('');
  console.log(colors.success('═'.repeat(60)));
  console.log(colors.success(`  ✅ Worktree '${name}' is ready!`));
  console.log(colors.success('═'.repeat(60)));
  console.log('');
  console.log(`${colors.bold('Path:')} ${worktree.path}`);
  console.log('');
}

/**
 * Open the editor
 */
async function openEditor(cmd: string, path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, [path], { detached: true, stdio: 'ignore' });
    proc.unref();
    proc.on('error', () => resolve(false));
    setTimeout(() => resolve(true), 100);
  });
}
