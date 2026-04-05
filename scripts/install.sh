#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dst="$HOME/.claude/skills"
mkdir -p "$dst"

for src in "$root"/neat-*; do
  [ -d "$src" ] || continue
  [ -f "$src/SKILL.md" ] || continue

  name=$(grep '^name:' "$src/SKILL.md" | head -1 | sed 's/^name: *//')
  if [ -z "$name" ]; then
    echo "ERROR: no name in $src/SKILL.md frontmatter" >&2
    continue
  fi

  if [ -L "$dst/$name" ] && [ "$(realpath "$dst/$name")" = "$(realpath "$src")" ]; then
    echo "INFO: $name already installed — skipping"
    continue
  elif [ -e "$dst/$name" ]; then
    echo "WARN: $dst/$name already exists — skipping"
    continue
  fi

  ln -s "$src" "$dst/$name" && echo "INFO: $name installed"
done
