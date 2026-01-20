/**
 * Git Worktree Manager MCP Server
 *
 * Provides worktree management capabilities to AI agents via MCP.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { listWorktrees, createWorktree, removeWorktree, getWorktreeByName } from '../core/worktree.js';
import { findMainWorktree, getRepoName } from '../core/git.js';
import { getAllPortStatuses } from '../core/ports.js';
import { isWorktreeError } from '../core/errors.js';

const VERSION = '1.0.0';

/**
 * MCP tool definitions
 */
const TOOLS = [
  {
    name: 'worktree_list',
    description:
      'List all git worktrees in the repository. Returns comprehensive information about each worktree including name, path, branch, and status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        cwd: {
          type: 'string',
          description: 'Working directory (defaults to current directory)',
        },
      },
    },
  },
  {
    name: 'worktree_create',
    description:
      'Create a new git worktree. Creates a new directory alongside the main repo with appropriate naming.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: "Short name for the worktree (e.g., 'feature-x', 'bugfix')",
        },
        branch: {
          type: 'string',
          description: 'Optional: branch to checkout (default: creates new branch)',
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'worktree_remove',
    description: 'Remove a git worktree by name.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name of the worktree to remove',
        },
        force: {
          type: 'boolean',
          description: 'Force removal even if there are changes',
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'worktree_get',
    description: 'Get detailed information about a specific worktree.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: "Name of the worktree (or 'main' for main worktree)",
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'worktree_ports',
    description: 'Check what processes are running on common development ports.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

/**
 * Handle tool calls
 */
async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const cwd = typeof args.cwd === 'string' ? args.cwd : process.cwd();

  try {
    switch (name) {
      case 'worktree_list': {
        const mainWorktree = await findMainWorktree(cwd);
        const repoName = getRepoName(mainWorktree);
        const worktrees = await listWorktrees(cwd);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ repository: repoName, mainPath: mainWorktree, worktrees }, null, 2),
            },
          ],
        };
      }

      case 'worktree_create': {
        const nameSchema = z.string().min(1);
        const parsedName = nameSchema.parse(args.name);
        const branch = typeof args.branch === 'string' ? args.branch : undefined;

        const worktree = await createWorktree({ name: parsedName, branch, cwd });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, worktree }, null, 2),
            },
          ],
        };
      }

      case 'worktree_remove': {
        const nameSchema = z.string().min(1);
        const parsedName = nameSchema.parse(args.name);
        const force = args.force === true;

        await removeWorktree({ name: parsedName, force, cwd });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, removed: parsedName }, null, 2),
            },
          ],
        };
      }

      case 'worktree_get': {
        const nameSchema = z.string().min(1);
        const parsedName = nameSchema.parse(args.name);

        const worktree = await getWorktreeByName(cwd, parsedName);
        if (!worktree) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Worktree '${parsedName}' not found` }, null, 2),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ worktree }, null, 2),
            },
          ],
        };
      }

      case 'worktree_ports': {
        const statuses = getAllPortStatuses();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ ports: statuses }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        };
    }
  } catch (error) {
    if (isWorktreeError(error)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message, code: error.code }, null, 2),
          },
        ],
      };
    }
    throw error;
  }
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  const server = new Server(
    { name: 'git-worktree-manager', version: VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, () =>
    Promise.resolve({
      tools: TOOLS,
    })
  );

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const { name, arguments: args } = request.params;
    const argsObj: Record<string, unknown> = args ?? {};
    return handleToolCall(name, argsObj);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
