/**
 * Hook detection and execution for git-worktree-manager
 *
 * Repos can define their own setup logic via hook scripts.
 * The worktree manager will detect and execute these hooks at appropriate times.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Standard hook script locations to check (in order of precedence)
 */
const HOOK_SCRIPT_LOCATIONS = [
  'scripts/worktree-hooks.sh',
  '.worktree/hooks.sh',
  'worktree-hooks.sh',
];

/**
 * Hook types that can be executed
 */
export type HookType = 'post-create' | 'post-switch' | 'pre-remove';

/**
 * Payload passed to hook scripts via stdin as JSON
 */
export type HookPayload = {
  /** Short name of the worktree (e.g., "feature-x") */
  worktreeName: string;
  /** Absolute path to the worktree directory */
  worktreePath: string;
  /** Absolute path to the main worktree */
  mainWorktreePath: string;
  /** Whether this is the main worktree */
  isMain: boolean;
  /** Port offset from base (0 for main, 1+ for worktrees) */
  portOffset: number;
};

/**
 * Result of hook execution
 */
export type HookResult = {
  /** Whether a hook script was found and executed */
  executed: boolean;
  /** Exit code of the hook script (0 = success) */
  exitCode: number;
  /** Path to the hook script that was executed */
  scriptPath?: string;
  /** Error message if hook failed */
  error?: string;
};

/**
 * Find the hook script in a project.
 *
 * @param projectRoot - Path to the project root (main worktree)
 * @returns Path to the hook script, or null if not found
 */
export function findHookScript(projectRoot: string): string | null {
  for (const location of HOOK_SCRIPT_LOCATIONS) {
    const scriptPath = join(projectRoot, location);
    if (existsSync(scriptPath)) {
      return scriptPath;
    }
  }
  return null;
}

/**
 * Check if a project has hook scripts configured.
 *
 * @param projectRoot - Path to the project root (main worktree)
 * @returns True if hook scripts are found
 */
export function hasHooks(projectRoot: string): boolean {
  return findHookScript(projectRoot) !== null;
}

/**
 * Execute a hook script with the given payload.
 *
 * The hook script is called with the hook type as the first argument,
 * and the payload is passed via stdin as JSON.
 *
 * @param hookType - Type of hook to execute
 * @param payload - Data to pass to the hook
 * @param projectRoot - Path to the project root (main worktree)
 * @returns Result of hook execution
 */
export async function executeHook(
  hookType: HookType,
  payload: HookPayload,
  projectRoot: string
): Promise<HookResult> {
  const scriptPath = findHookScript(projectRoot);

  if (!scriptPath) {
    return {
      executed: false,
      exitCode: 0,
    };
  }

  return new Promise((resolve) => {
    const proc = spawn('bash', [scriptPath, hookType], {
      cwd: projectRoot,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    // Send payload via stdin
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();

    proc.on('close', (code) => {
      resolve({
        executed: true,
        exitCode: code ?? 0,
        scriptPath,
      });
    });

    proc.on('error', (error) => {
      resolve({
        executed: true,
        exitCode: 1,
        scriptPath,
        error: error.message,
      });
    });
  });
}

/**
 * Execute a hook and handle errors gracefully.
 * Logs warnings but doesn't throw on hook failures.
 *
 * @param hookType - Type of hook to execute
 * @param payload - Data to pass to the hook
 * @param projectRoot - Path to the project root
 * @param logger - Optional logger function for status messages
 * @returns Result of hook execution
 */
export async function executeHookSafe(
  hookType: HookType,
  payload: HookPayload,
  projectRoot: string,
  logger?: (message: string) => void
): Promise<HookResult> {
  const log = logger ?? console.log;

  const result = await executeHook(hookType, payload, projectRoot);

  if (!result.executed) {
    return result;
  }

  if (result.exitCode !== 0) {
    log(`  ⚠ Hook '${hookType}' exited with code ${result.exitCode}`);
    if (result.error) {
      log(`    Error: ${result.error}`);
    }
  }

  return result;
}
