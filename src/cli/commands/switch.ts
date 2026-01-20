/**
 * wt switch command
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getWorktreeByName, fixDetachedHead, getWorktreePortOffset } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { loadConfig } from '../../core/config.js';
import { setupEnvironment } from '../../core/environment.js';
import { calculatePorts } from '../../core/ports.js';
import { syncCursorRules } from '../../core/cursor-rules.js';
import { printHeader, printSection, printWarning, printError, colors } from '../formatter.js';
import { WorktreeNotFoundError } from '../../core/errors.js';

type SwitchOptions = {
  noEditor?: boolean;
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
    console.log('Usage: wt switch <name> [--no-editor]');
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

  // Step 2: Sync cursor rules
  printSection('Step 2: Syncing Cursor Rules');
  if (!worktree.isMain) {
    const rulesResult = await syncCursorRules(mainWorktree, worktree.path);
    if (rulesResult.copiedCount > 0) {
      console.log(
        `  ${colors.success(`✓ Synced ${rulesResult.copiedCount} cursor rule(s) from main`)}`
      );
    }
    if (rulesResult.skippedCount > 0) {
      console.log(
        colors.dim(`  Skipped ${rulesResult.skippedCount} rule(s) (already exist via git)`)
      );
    }
    if (rulesResult.copiedCount === 0 && rulesResult.skippedCount === 0) {
      console.log(colors.dim('  No cursor rules found to sync'));
    }
  } else {
    console.log(colors.dim('  Skipping (main worktree)'));
  }

  // Step 3: Environment setup
  printSection('Step 3: Environment Setup');
  const offset = await getWorktreePortOffset(cwd, name);
  const ports = calculatePorts(config, offset);

  if (!worktree.isMain) {
    const envResult = await setupEnvironment(mainWorktree, worktree.path, ports);
    if (envResult.configured) {
      console.log(`  ${colors.success(`✓ Ports: API=${ports.apiPort}, Web=${ports.webPort}`)}`);
    } else {
      console.log(colors.dim('  No env files detected to configure'));
    }
  } else {
    console.log(colors.dim('  Using main worktree ports'));
  }

  // Step 4: Dependencies
  printSection('Step 4: Dependencies');
  const packageJsonPath = join(worktree.path, 'package.json');
  if (existsSync(packageJsonPath)) {
    if (worktree.hasDeps) {
      console.log(`  ${colors.success('✓ Dependencies already installed')}`);
    } else {
      console.log('  Installing dependencies...');
      await installDependencies(worktree.path);
      console.log(`  ${colors.success('✓ Dependencies installed')}`);
    }
  } else {
    console.log(colors.dim('  No package.json found'));
  }

  // Step 5: Open editor
  if (!options.noEditor) {
    printSection('Step 5: Opening Editor');
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
  console.log(colors.bold('Ports:'));
  console.log(`  API: ${colors.cyan(`http://localhost:${ports.apiPort}`)}`);
  console.log(`  Web: ${colors.cyan(`http://localhost:${ports.webPort}`)}`);
  console.log('');
}

/**
 * Install dependencies using the appropriate package manager
 */
async function installDependencies(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd = 'npm';
    const args = ['install'];

    if (existsSync(join(path, 'pnpm-lock.yaml'))) {
      cmd = 'pnpm';
    } else if (existsSync(join(path, 'yarn.lock'))) {
      cmd = 'yarn';
    }

    const proc = spawn(cmd, args, { cwd: path, stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} install failed with code ${code}`));
    });
  });
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
