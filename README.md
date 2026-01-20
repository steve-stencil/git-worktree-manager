# Git Worktree Manager (`wt`)

A TypeScript tool for managing git worktrees with automatic port allocation, environment file setup, and AI agent integration via MCP (Model Context Protocol).

## Features

- **Easy worktree management** - Create, switch, and remove worktrees with simple commands
- **Automatic port allocation** - Each worktree gets unique API and web ports
- **Environment file setup** - Automatically copies and configures .env files with correct ports
- **Cursor rules syncing** - Syncs `.cursor/rules/*.mdc` files including gitignored ones
- **MCP server integration** - Native AI agent support via Model Context Protocol
- **Full terminal compatibility** - Works in any terminal, not just IDE-specific

## Installation

### From npm (recommended)

```bash
npm install -g git-worktree-manager
```

### From source

```bash
git clone https://github.com/yourusername/git-worktree-manager.git
cd git-worktree-manager
pnpm install
pnpm build
npm link  # Makes 'wt' available globally
```

## Quick Start

```bash
# List all worktrees
wt list

# Create a new worktree
wt create feature-x

# Set up and open a worktree (installs deps, configures env, opens editor)
wt switch feature-x

# Remove a worktree
wt remove feature-x
```

## CLI Commands

### `wt list` (aliases: `ls`, `l`)

List all git worktrees with status information.

```bash
wt list
```

Shows:
- Main worktree location
- All worktrees with branch, path, env status, and dependencies status

### `wt create <name> [branch]` (aliases: `new`, `c`)

Create a new worktree.

```bash
wt create feature-x          # Creates new branch worktree/feature-x
wt create bugfix main        # Checkout existing 'main' branch
```

### `wt switch <name>` (aliases: `sw`, `s`)

Set up a worktree and open it in your editor. This command:

1. Fixes detached HEAD state (if any)
2. Syncs cursor rules from main worktree
3. Copies and configures environment files with unique ports
4. Installs dependencies (if needed)
5. Opens the worktree in your editor

```bash
wt switch feature-x
wt switch feature-x --no-editor  # Skip opening editor
```

### `wt remove <name>` (aliases: `rm`, `d`, `delete`)

Remove a worktree.

```bash
wt remove feature-x
wt remove feature-x --force  # Force removal
```

### `wt status` (alias: `st`)

Show a detailed status table of all worktrees.

```bash
wt status
```

### `wt ports` (alias: `p`)

Check what's running on common development ports.

```bash
wt ports
```

### `wt cd <name>`

Print the path to a worktree (for shell navigation).

```bash
cd $(wt cd feature-x)
```

## Configuration

### Global Configuration (`~/.wtconfig`)

```bash
# Editor to open worktrees with
EDITOR_CMD=cursor

# Base ports (worktrees get offset from these)
BASE_API_PORT=4000
BASE_WEB_PORT=5173
```

### Project Configuration (`.wtconfig` in repo root)

Same format as global config. Project config overrides global config.

### Default Values

| Setting | Default |
|---------|---------|
| `EDITOR_CMD` | `cursor` |
| `BASE_API_PORT` | `4000` |
| `BASE_WEB_PORT` | `5173` |

## Port Allocation

Ports are automatically assigned based on worktree position:

| Worktree | API Port | Web Port |
|----------|----------|----------|
| main | 4000 | 5173 |
| worktree 1 | 4001 | 5174 |
| worktree 2 | 4002 | 5175 |
| worktree 3 | 4003 | 5176 |

## Environment File Handling

The tool automatically detects and copies env files from common locations:

- `.env` (root)
- `apps/api/.env`
- `apps/web/.env`
- `packages/api/.env`

Port variables are automatically substituted:

- `PORT` → API port
- `APP_URL` → `http://localhost:{webPort}`
- `VITE_API_BASE` → `http://localhost:{apiPort}/api`
- `VITE_PORT` → Web port

## Cursor Rules Syncing

When switching to a worktree, the tool syncs `.cursor/rules/*.mdc` files from the main worktree:

- **Gitignored files** (like `credentials.mdc`) are always copied
- **Non-gitignored files** are only copied if they don't exist in the target

This ensures your AI coding assistant has the same rules across all worktrees.

## MCP Server Integration

Start the MCP server for AI agent integration:

```bash
wt --mcp
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `worktree_list` | List all worktrees with detailed info |
| `worktree_create` | Create a new worktree |
| `worktree_remove` | Remove a worktree |
| `worktree_get` | Get info about a specific worktree |
| `worktree_ports` | Check port usage status |

### Cursor MCP Configuration

Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "git-worktree-manager": {
      "command": "wt",
      "args": ["--mcp"]
    }
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build
```

## Project Structure

```
src/
├── core/           # Core business logic
│   ├── types.ts    # TypeScript types
│   ├── errors.ts   # Custom error classes
│   ├── config.ts   # Configuration loading
│   ├── git.ts      # Git operations
│   ├── worktree.ts # Worktree CRUD
│   ├── environment.ts # Env file management
│   ├── ports.ts    # Port allocation
│   └── cursor-rules.ts # Cursor rules syncing
├── cli/            # CLI interface
│   ├── index.ts    # Main entry point
│   ├── formatter.ts # Output formatting
│   └── commands/   # CLI commands
└── mcp/            # MCP server
    └── index.ts    # MCP server implementation
```

## License

MIT
