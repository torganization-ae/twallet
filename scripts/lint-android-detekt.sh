#!/usr/bin/env bash
# Run detekt CLI against Android Air sources.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
DETEKT_VERSION="1.23.7"
DETEKT_JAR="$TOOLS/detekt-cli.jar"

mkdir -p "$TOOLS"
if [[ ! -f "$DETEKT_JAR" ]]; then
  echo "Downloading detekt $DETEKT_VERSION..."
  curl -sL -o "$DETEKT_JAR" \
    "https://github.com/detekt/detekt/releases/download/v${DETEKT_VERSION}/detekt-cli-${DETEKT_VERSION}-all.jar"
fi

TARGET="${1:-mobile/android/air/SubModules}"
cd "$ROOT"
java -jar "$DETEKT_JAR" \
  --config "$ROOT/mobile/android/detekt.yml" \
  --input "$TARGET" \
  --excludes "**/build/**,**/vkryl/**"
