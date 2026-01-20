/**
 * wt ports command
 */

import { listWorktrees } from '../../core/worktree.js';
import { findMainWorktree } from '../../core/git.js';
import { loadConfig } from '../../core/config.js';
import { getAllPortStatuses, formatPortAllocation } from '../../core/ports.js';
import { printHeader, printTip, formatRow, colors } from '../formatter.js';

/**
 * Show port usage
 */
export async function portsCommand(cwd: string): Promise<void> {
  const mainWorktree = await findMainWorktree(cwd);
  const config = await loadConfig(mainWorktree);
  const worktrees = await listWorktrees(cwd);
  const portStatuses = getAllPortStatuses();

  printHeader('Development Ports Status');

  console.log(colors.bold('Checking common development ports...'));
  console.log('');

  const widths = [8, 12, 40];
  console.log(formatRow(['PORT', 'STATUS', 'PROCESS'], widths));
  console.log(formatRow(['────', '──────', '───────'], widths));

  for (const status of portStatuses) {
    const statusText = status.inUse ? '🟢 In Use' : '⚪ Free';
    const process = status.inUse ? `${status.process} (PID: ${status.pid})` : '-';
    console.log(formatRow([String(status.port), statusText, process], widths));
  }

  console.log('');
  printTip('Kill a process with: kill <PID>');
  console.log('');

  console.log(colors.bold('Port Allocation (wt assigns automatically):'));
  const allocations = formatPortAllocation(config, worktrees.length - 1);
  for (const line of allocations) {
    console.log(`  ${line}`);
  }
}
