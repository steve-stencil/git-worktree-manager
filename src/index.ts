/**
 * Git Worktree Manager
 *
 * A TypeScript tool for managing git worktrees with CLI and MCP interfaces.
 *
 * @packageDocumentation
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

/** Package version from package.json */
export const VERSION: string = packageJson.version;

// Core exports
export * from './core/types.js';
export * from './core/errors.js';
export * from './core/config.js';
export * from './core/git.js';
export * from './core/worktree.js';
export * from './core/ports.js';
export * from './core/hooks.js';
