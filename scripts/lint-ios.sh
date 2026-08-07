#!/usr/bin/env bash
# Lint iOS Swift sources with SwiftLint.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
SWIFTLINT="$TOOLS/swiftlint"

if ! command -v swiftlint >/dev/null 2>&1 && [[ ! -x "$SWIFTLINT" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if command -v brew >/dev/null 2>&1; then
      brew install swiftlint
    else
      echo "SwiftLint not found. Install with: brew install swiftlint" >&2
      exit 1
    fi
  else
    echo "SwiftLint is not available on this platform ($(uname -s)). Skipping." >&2
    exit 0
  fi
fi

BIN="$(command -v swiftlint || echo "$SWIFTLINT")"
TARGET="${1:-mobile/ios/Air/SubModules}"
cd "$ROOT"

if [[ "${FIX:-}" == "1" ]]; then
  "$BIN" lint --fix --config "$ROOT/mobile/ios/.swiftlint.yml" --path "$TARGET"
else
  "$BIN" lint --config "$ROOT/mobile/ios/.swiftlint.yml" --path "$TARGET" --strict
fi
