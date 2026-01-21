#!/bin/bash
# install.sh - Install the wt (Git Worktree Manager) CLI tool
#
# This installs the TypeScript CLI globally using npm/pnpm.
#
# Usage:
#   ./install.sh           # Install globally
#   ./install.sh --link    # Use symlink (for development)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  Installing wt - Git Worktree Manager${NC}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Determine script source location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for package.json (must be run from repo)
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo "Please run this script from the git-worktree-manager repository root."
    exit 1
fi

# Detect package manager
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MGR="npm"
else
    echo -e "${RED}Error: npm or pnpm is required${NC}"
    exit 1
fi

echo -e "📦 Using package manager: ${CYAN}$PKG_MGR${NC}"
echo ""

# Install dependencies
echo -e "📥 Installing dependencies..."
$PKG_MGR install
echo ""

# Build
echo -e "🔨 Building TypeScript..."
$PKG_MGR run build
echo ""

# Install globally
if [ "$1" = "--link" ]; then
    echo -e "🔗 Linking globally (development mode)..."
    $PKG_MGR link --global
else
    echo -e "📦 Installing globally..."
    if [ "$PKG_MGR" = "pnpm" ]; then
        pnpm add -g "file:$SCRIPT_DIR"
    else
        npm install -g "$SCRIPT_DIR"
    fi
fi

echo ""

# Verify installation
if command -v wt &> /dev/null; then
    WS_VERSION=$(wt --version 2>/dev/null || echo "installed")
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Version: ${CYAN}$WS_VERSION${NC}"
    echo ""
    echo -e "Get started:"
    echo -e "  ${CYAN}wt help${NC}                        # Show all commands"
    echo -e "  ${CYAN}wt list${NC}                        # List worktrees in current repo"
    echo -e "  ${CYAN}wt create myfeature${NC}            # Create a new worktree"
    echo -e "  ${CYAN}wt create myfeature --from dev${NC} # Create from a base branch"
    echo -e "  ${CYAN}wt switch myfeature${NC}            # Set up and open worktree"
    echo ""
else
    echo -e "${YELLOW}⚠️  'wt' command not found in PATH${NC}"
    echo ""
    echo "You may need to add the global bin directory to your PATH."
    echo ""
    if [ "$PKG_MGR" = "pnpm" ]; then
        echo -e "For pnpm, run:"
        echo -e "  ${CYAN}pnpm setup${NC}"
        echo ""
    fi
    echo "Then restart your terminal or run:"
    echo -e "  ${CYAN}source ~/.zshrc${NC}  # or ~/.bashrc"
fi
