#!/bin/bash
# install.sh - Install the wt (Git Worktree Manager) tool
#
# Usage:
#   ./install.sh              # Install to ~/.local/bin (default)
#   ./install.sh /usr/local/bin  # Install to custom location
#
# Or via curl:
#   curl -fsSL https://raw.githubusercontent.com/steve-stencil/git-worktree-manager/main/install.sh | bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Default install location
INSTALL_DIR="${1:-$HOME/.local/bin}"
SCRIPT_NAME="wt"

echo ""
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  Installing wt - Git Worktree Manager${NC}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Determine script source location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/wt" ]; then
    # Installing from cloned repo
    SOURCE_FILE="$SCRIPT_DIR/wt"
    echo -e "📁 Source: ${CYAN}$SOURCE_FILE${NC}"
else
    # Installing via curl - download the script
    echo -e "📥 Downloading wt script..."
    SOURCE_FILE=$(mktemp)
    curl -fsSL "https://raw.githubusercontent.com/steve-stencil/git-worktree-manager/main/wt" -o "$SOURCE_FILE"
    CLEANUP_SOURCE=true
fi

# Create install directory if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "📂 Creating directory: ${CYAN}$INSTALL_DIR${NC}"
    mkdir -p "$INSTALL_DIR"
fi

# Copy the script
echo -e "📋 Installing to: ${CYAN}$INSTALL_DIR/$SCRIPT_NAME${NC}"
cp "$SOURCE_FILE" "$INSTALL_DIR/$SCRIPT_NAME"
chmod +x "$INSTALL_DIR/$SCRIPT_NAME"

# Cleanup if we downloaded
if [ "${CLEANUP_SOURCE:-false}" = true ]; then
    rm -f "$SOURCE_FILE"
fi

# Check if install dir is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  $INSTALL_DIR is not in your PATH${NC}"
    echo ""
    echo -e "Add it to your shell config:"
    echo ""
    
    # Detect shell
    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
        zsh)
            echo -e "  ${CYAN}echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc${NC}"
            echo -e "  ${CYAN}source ~/.zshrc${NC}"
            ;;
        bash)
            echo -e "  ${CYAN}echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.bashrc${NC}"
            echo -e "  ${CYAN}source ~/.bashrc${NC}"
            ;;
        *)
            echo -e "  ${CYAN}export PATH=\"$INSTALL_DIR:\$PATH\"${NC}"
            ;;
    esac
    echo ""
fi

# Verify installation
if command -v wt &> /dev/null || [ -x "$INSTALL_DIR/$SCRIPT_NAME" ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Installation complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Get started:"
    echo -e "  ${CYAN}wt help${NC}              # Show all commands"
    echo -e "  ${CYAN}wt list${NC}              # List worktrees in current repo"
    echo -e "  ${CYAN}wt create myfeature${NC}  # Create a new worktree"
    echo -e "  ${CYAN}wt switch myfeature${NC}  # Set up and open worktree"
    echo ""
else
    echo -e "${RED}❌ Installation may have failed. Please check the output above.${NC}"
    exit 1
fi
