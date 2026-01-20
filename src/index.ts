/**
 * Git Worktree Manager
 *
 * A TypeScript tool for managing git worktrees with CLI and MCP interfaces.
 *
 * @packageDocumentation
 */

export const VERSION = '1.0.0';

// Core exports
export * from './core/types.js';
export * from './core/errors.js';
export * from './core/config.js';
export * from './core/git.js';
export * from './core/worktree.js';
export * from './core/environment.js';
export * from './core/ports.js';
export * from './core/cursor-rules.js';
