/**
 * wt shell-init command
 *
 * Outputs a shell function that wraps `wt` to enable
 * automatic directory switching on `wt switch`.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CD_FILE = join(tmpdir(), '.wt-switch-path');

/**
 * Print shell wrapper function for eval
 */
export function shellInitCommand(): void {
  const script = `
wt() {
  command wt "$@"
  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    case "$1" in
      switch|sw|s)
        local target="${CD_FILE}"
        if [ -f "$target" ]; then
          local dir
          dir=$(cat "$target")
          rm -f "$target"
          if [ -n "$dir" ] && [ -d "$dir" ]; then
            cd "$dir" || return 1
            echo "Changed directory to $dir"
          fi
        fi
        ;;
    esac
  fi
  return $exit_code
}`.trim();

  console.log(script);
}
