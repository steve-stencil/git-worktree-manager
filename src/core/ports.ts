/**
 * Port detection and allocation for worktrees
 */

import { execSync } from 'node:child_process';
import { type Config, type PortAllocation } from './types.js';

/**
 * Calculate port allocation for a worktree.
 */
export function calculatePorts(config: Config, offset: number): PortAllocation {
  return {
    apiPort: config.baseApiPort + offset,
    webPort: config.baseWebPort + offset,
    offset,
  };
}

/**
 * Port status information
 */
export type PortStatus = {
  port: number;
  inUse: boolean;
  pid?: number;
  process?: string;
};

/**
 * Check if a port is in use (macOS/Linux).
 */
export function checkPortUsage(port: number): PortStatus {
  try {
    const output = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim();

    if (!output) {
      return { port, inUse: false };
    }

    const pid = parseInt(output.split('\n')[0] ?? '', 10);

    let process: string | undefined;
    try {
      process = execSync(`ps -p ${pid} -o comm= 2>/dev/null`, {
        encoding: 'utf-8',
      }).trim();
    } catch {
      process = 'unknown';
    }

    return { port, inUse: true, pid, process };
  } catch {
    return { port, inUse: false };
  }
}

/**
 * Default development ports to check
 */
export const COMMON_DEV_PORTS = [3000, 3001, 4000, 4001, 4002, 4003, 5173, 5174, 5175, 5176, 8080, 8081];

/**
 * Get status of all common development ports.
 */
export function getAllPortStatuses(): PortStatus[] {
  return COMMON_DEV_PORTS.map(checkPortUsage);
}

/**
 * Format port allocation information for display.
 */
export function formatPortAllocation(config: Config, worktreeCount: number): string[] {
  const lines: string[] = [];

  lines.push(`main:       API=${config.baseApiPort}, Web=${config.baseWebPort}`);

  for (let i = 1; i <= worktreeCount; i++) {
    lines.push(`worktree ${i}: API=${config.baseApiPort + i}, Web=${config.baseWebPort + i}`);
  }

  return lines;
}
