#!/bin/bash
# Claude Code's PostToolUse hook (.claude/settings.json) after Edit and Write: runs the edited
# file through its package's `lint` script tools (Biome with --write, then Oxlint where the script
# runs it) and reports what's left to Claude with exit 2, so a violation is fixed at the edit
# instead of at `bun check` or CI.
# Fails open (exit 0) when there's no file, no package or no installed linter.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in /*) ;; *) file="$PWD/$file" ;; esac

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) oxlint_file=1 ;;
  *.json|*.jsonc|*.css) oxlint_file=0 ;;
  *) exit 0 ;;
esac

# Run from the file's package: the root biome.json extends @repo/biome-config, which only
# resolves from a package that depends on it (run from the root, Biome fails and changes nothing).
dir=$(dirname "$file")
while [ "$dir" != "/" ] && [ ! -f "$dir/package.json" ]; do dir=$(dirname "$dir"); done
[ "$dir" = "/" ] && exit 0

bin=$dir
while [ "$bin" != "/" ] && [ ! -x "$bin/node_modules/.bin/biome" ]; do bin=$(dirname "$bin"); done
[ "$bin" = "/" ] && exit 0
bin="$bin/node_modules/.bin"

cd "$dir" || exit 0
report=""

if ! out=$("$bin/biome" check --write --error-on-warnings --no-errors-on-unmatched --colors=off "$file" 2>&1); then
  report+="Biome:"$'\n'"$out"$'\n'
fi

if [ "$oxlint_file" = 1 ] && grep -q '"lint": *"[^"]*oxlint' package.json && [ -x "$bin/oxlint" ]; then
  if ! out=$("$bin/oxlint" --deny-warnings --no-error-on-unmatched-pattern "$file" 2>&1); then
    report+="Oxlint:"$'\n'"$out"$'\n'
  fi
fi

[ -z "$report" ] && exit 0

{
  echo "Lint errors remain in ${file#"$(git rev-parse --show-toplevel 2>/dev/null)"/} after autofix. Fix the code (never loosen a rule):"
  printf '%s' "$report" | head -n 80
} >&2
exit 2
