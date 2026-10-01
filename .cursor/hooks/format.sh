#!/bin/bash
# Formats and lint-fixes an edited source file with Biome. Run by Cursor's afterFileEdit hook
# (.cursor/hooks.json) and Claude Code's PostToolUse hook (.claude/settings.json).
# Fails open (exit 0) so a formatting hiccup never blocks the agent.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .file_path // .filePath // .path // (.edits[0].file_path) // empty')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in /*) ;; *) file="$PWD/$file" ;; esac

# Run from the file's package: the root biome.json extends @repo/biome-config, which only
# resolves from a package that depends on it (run from the root, Biome fails and changes nothing).
dir=$(dirname "$file")
while [ "$dir" != "/" ] && [ ! -f "$dir/package.json" ]; do dir=$(dirname "$dir"); done

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.css)
    (cd "$dir" && bunx biome check --write --no-errors-on-unmatched "$file") >/dev/null 2>&1
    ;;
esac

exit 0
