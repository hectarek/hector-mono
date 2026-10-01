#!/bin/bash
# afterFileEdit hook: deterministically format/lint-fix edited source files with Biome.
# Fails open (exit 0) so a formatting hiccup never blocks the agent.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.file_path // .filePath // .path // (.edits[0].file_path) // empty')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.css)
    bunx biome check --write --no-errors-on-unmatched "$file" >/dev/null 2>&1
    ;;
esac

exit 0
