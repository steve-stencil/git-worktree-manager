#!/usr/bin/env node

/**
 * Git Worktree Manager CLI
 */

import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { createCommand } from './commands/create.js';
import { switchCommand } from './commands/switch.js';
import { removeCommand } from './commands/remove.js';
import { statusCommand } from './commands/status.js';
import { portsCommand } from './commands/ports.js';
import { cdCommand } from './commands/cd.js';
import { printError } from './formatter.js';
import { isWorktreeError } from '../core/errors.js';
import { VERSION } from '../index.js';

const program = new Command();

program
  .name('wt')
  .description('Git Worktree Manager - Manage git worktrees with ease')
  .version(VERSION);

program
  .command('list')
  .aliases(['ls', 'l'])
  .description('List all worktrees')
  .action(async () => {
    await runCommand(() => listCommand(process.cwd()));
  });

program
  .command('create <name> [branch]')
  .aliases(['new', 'c'])
  .description('Create a new worktree')
  .option('--no-hooks', 'Skip running post-create hooks')
  .action(async (name: string, branch: string | undefined, options: { noHooks?: boolean }) => {
    await runCommand(() => createCommand(name, branch, options, process.cwd()));
  });

program
  .command('switch <name>')
  .aliases(['sw', 's'])
  .description('Set up worktree and open in editor')
  .option('--no-editor', 'Skip opening editor')
  .option('--no-hooks', 'Skip running post-switch hooks')
  .action(async (name: string, options: { noEditor?: boolean; noHooks?: boolean }) => {
    await runCommand(() => switchCommand(name, options, process.cwd()));
  });

program
  .command('remove <name>')
  .aliases(['rm', 'd', 'delete'])
  .description('Remove a worktree')
  .option('-f, --force', 'Force removal')
  .option('--no-hooks', 'Skip running pre-remove hooks')
  .action(async (name: string, options: { force?: boolean; noHooks?: boolean }) => {
    await runCommand(() => removeCommand(name, options, process.cwd()));
  });

program
  .command('status')
  .aliases(['st'])
  .description('Show detailed status table')
  .action(async () => {
    await runCommand(() => statusCommand(process.cwd()));
  });

program
  .command('ports')
  .aliases(['p'])
  .description("Show what's running on dev ports")
  .action(async () => {
    await runCommand(() => portsCommand(process.cwd()));
  });

program
  .command('cd <name>')
  .description('Print path to worktree (use: cd $(wt cd name))')
  .action(async (name: string) => {
    await runCommand(() => cdCommand(name, process.cwd()));
  });

// Check for --mcp flag to start MCP server instead
if (process.argv.includes('--mcp')) {
  void import('../mcp/index.js').then(async (mcp) => {
    await mcp.startServer();
  });
} else {
  program.parse();
}

/**
 * Run a command with error handling
 */
async function runCommand(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (isWorktreeError(error)) {
      printError(error.message);
      process.exit(1);
    }
    throw error;
  }
}
