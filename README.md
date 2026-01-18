# wt - Git Worktree Manager

A universal CLI tool for managing git worktrees across any project. Simplifies the workflow of creating, switching, and managing multiple worktrees with automatic environment setup.

## Features

- **Create worktrees** with automatic branch creation
- **Switch worktrees** with full setup:
  - Fixes detached HEAD state
  - Syncs Cursor IDE rules (including gitignored files like credentials)
  - Creates `.env` files with unique ports
  - Installs dependencies (npm/yarn/pnpm)
  - Opens in your editor
- **List worktrees** with status overview
- **Port management** to avoid conflicts between worktrees
- **Universal** - works with any git repository

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/steve-stencil/git-worktree-manager/main/install.sh | bash
```

### Manual Install via Git

```bash
# Clone the repository
git clone https://github.com/steve-stencil/git-worktree-manager.git ~/.git-worktree-manager

# Run the install script
~/.git-worktree-manager/install.sh

# Or manually copy to your PATH
cp ~/.git-worktree-manager/wt ~/.local/bin/wt
chmod +x ~/.local/bin/wt
```

### Manual Install (Direct Download)

```bash
# Create local bin directory if it doesn't exist
mkdir -p ~/.local/bin

# Download the script
curl -o ~/.local/bin/wt https://raw.githubusercontent.com/steve-stencil/git-worktree-manager/main/wt

# Make it executable
chmod +x ~/.local/bin/wt

# Add to PATH (add to your .zshrc or .bashrc)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Quick Start

```bash
# Navigate to any git repository
cd ~/projects/myrepo

# Create a new worktree
wt create myfeature

# Set up and open the worktree
wt switch myfeature
```

### Commands

| Command | Description |
|---------|-------------|
| `wt create <name> [branch]` | Create a new worktree |
| `wt switch <name>` | Full setup: env, deps, open editor |
| `wt remove <name> [--force]` | Remove a worktree |
| `wt list` | List all worktrees |
| `wt status` | Show detailed status table |
| `wt ports` | Show what's running on dev ports |
| `wt cd <name>` | Print path (use: `cd $(wt cd name)`) |
| `wt help` | Show help message |

### Examples

```bash
# Create a worktree for a new feature
wt create auth-refactor

# Create from an existing branch
wt create bugfix feat/existing-branch

# Switch to a worktree (runs full setup)
wt switch auth-refactor

# Switch without opening editor
wt switch auth-refactor --no-editor

# List all worktrees with status
wt list

# See detailed status table
wt status

# Check what's using development ports
wt ports

# Navigate to a worktree
cd $(wt cd auth-refactor)

# Remove a worktree
wt remove auth-refactor
```

## Configuration

Create `~/.wtconfig` to customize behavior:

```bash
# Editor to open worktrees with (default: cursor)
EDITOR_CMD="code"

# Starting port for API servers (default: 4000)
BASE_API_PORT=4000

# Starting port for web servers (default: 5173)
BASE_WEB_PORT=5173
```

### Port Allocation

The tool automatically assigns unique ports to each worktree:

| Worktree | API Port | Web Port |
|----------|----------|----------|
| main | 4000 | 5173 |
| worktree 1 | 4001 | 5174 |
| worktree 2 | 4002 | 5175 |

## Worktree Directory Structure

Worktrees are created alongside the main repository:

```
~/projects/
├── myrepo/              # Main repository
├── myrepo-feature-x/    # Worktree 'feature-x'
├── myrepo-bugfix/       # Worktree 'bugfix'
└── myrepo-experiment/   # Worktree 'experiment'
```

## What `wt switch` Does

When you run `wt switch <name>`, the tool:

1. **Checks Git State** - Fixes detached HEAD by creating/checking out a branch
2. **Syncs Cursor Rules** - Copies `.cursor/rules/*.mdc` files from main (including gitignored files like `credentials.mdc`)
3. **Sets Up Environment** - Copies `.env` files with unique ports for the worktree
4. **Installs Dependencies** - Runs `pnpm/yarn/npm install` if needed
5. **Opens Editor** - Launches your configured editor

## Cursor IDE Integration

The tool automatically syncs Cursor IDE rules from the main worktree, including:
- Gitignored rule files (like `credentials.mdc` with test credentials)
- Any `.mdc` files that don't exist in the target worktree

This ensures consistent AI assistant behavior across all your worktrees.

## Requirements

- Git 2.5+ (for worktree support)
- Bash 4.0+
- macOS or Linux

## Updating

To update to the latest version:

```bash
# If installed via git clone
cd ~/.git-worktree-manager
git pull
./install.sh

# Or re-run the curl install
curl -fsSL https://raw.githubusercontent.com/steve-stencil/git-worktree-manager/main/install.sh | bash
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
