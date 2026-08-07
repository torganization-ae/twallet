#!/usr/bin/env bash
# Lint Android Kotlin sources with ktlint (standalone CLI).
# Downloads ktlint into .tools/ if needed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
KTLINT_VERSION="1.5.0"
KTLINT="$TOOLS/ktlint"

mkdir -p "$TOOLS"
if [[ ! -x "$KTLINT" ]]; then
  echo "Downloading ktlint $KTLINT_VERSION..."
  curl -sL -o "$KTLINT" "https://github.com/pinterest/ktlint/releases/download/${KTLINT_VERSION}/ktlint"
  chmod +x "$KTLINT"
fi

TARGET="${1:-mobile/android/air/SubModules}"
cd "$ROOT"

if [[ "${FIX:-}" == "1" ]]; then
  "$KTLINT" --format --relative --editorconfig="$ROOT/mobile/android/.editorconfig" "$TARGET"
else
  "$KTLINT" --relative --editorconfig="$ROOT/mobile/android/.editorconfig" "$TARGET"
fi
