#!/usr/bin/env bash
# PostToolUse hook: format and lint-fix each file Claude edits, using the owning
# app's own prettier and eslint config. Remaining lint errors are sent back to
# Claude (exit 2) so it fixes them now instead of at `pnpm verify`.
set -uo pipefail

# Parse the hook JSON with node rather than jq, since node is always present here.
file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$root"/apps/web/*) app="$root/apps/web" ;;
  "$root"/apps/server/*) app="$root/apps/server" ;;
  *) exit 0 ;;
esac

cd "$app" || exit 0

if ! out=$(pnpm exec prettier --write --ignore-unknown --log-level warn "$file" 2>&1); then
  echo "prettier failed on $file:" >&2
  echo "$out" >&2
  exit 2
fi

case "$file" in
  *.ts | *.tsx | *.js | *.jsx) ;;
  *) exit 0 ;;
esac

if ! out=$(pnpm exec eslint --fix --no-warn-ignored "$file" 2>&1); then
  echo "eslint errors remain in $file after --fix:" >&2
  echo "$out" >&2
  exit 2
fi
