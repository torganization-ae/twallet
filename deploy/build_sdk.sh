#!/bin/bash

# Build SDK
rm -rf dist-air
SDK_OUTPUT_CLEAN=1 webpack --config webpack-air.config.ts

bash ./deploy/copy_to_dist.sh

IOS_LEGACY_TARGET="mobile/ios/Air/SubModules/WalletResources/Resources/JS"
IOS_TWALLET_TARGET="mobile/ios/App/App/Resources/Twallet/JS"
ANDROID_TWALLET_TARGET="mobile/android/app/src/twallet/assets/js"

mkdir -p "$IOS_TWALLET_TARGET"
mkdir -p "$ANDROID_TWALLET_TARGET"

# Copy SDK to iOS target-specific asset dirs
rm -f "$IOS_LEGACY_TARGET"/*-sdk.js "$IOS_LEGACY_TARGET"/*-sdk.js.LICENSE.txt

rm -f "$IOS_TWALLET_TARGET"/*-sdk.js "$IOS_TWALLET_TARGET"/*-sdk.js.LICENSE.txt
cp dist-air/twallet-sdk.js "$IOS_TWALLET_TARGET/"
cp dist-air/twallet-sdk.js.LICENSE.txt "$IOS_TWALLET_TARGET/" 2>/dev/null || true

# Copy SDK to Android flavor-specific asset dirs
rm -f "$ANDROID_TWALLET_TARGET"/*-sdk.js "$ANDROID_TWALLET_TARGET"/*-sdk.js.LICENSE.txt
cp dist-air/twallet-sdk.js "$ANDROID_TWALLET_TARGET/"
cp dist-air/twallet-sdk.js.LICENSE.txt "$ANDROID_TWALLET_TARGET/" 2>/dev/null || true

# Build .xcstrings from YAML locale files
PY_SCRIPTS_DIR="./mobile/ios/Air/scripts/strings"
PY_VENV_DIR="$PY_SCRIPTS_DIR/.venv"

if [ ! -d "$PY_VENV_DIR" ]; then
  python3 -m venv "$PY_VENV_DIR"
fi

"$PY_VENV_DIR/bin/python" -m pip install --disable-pip-version-check --upgrade pip
"$PY_VENV_DIR/bin/python" -m pip install --disable-pip-version-check -r "$PY_SCRIPTS_DIR/requirements.txt"

"$PY_VENV_DIR/bin/python" "$PY_SCRIPTS_DIR/import_localizations.py"

echo "SDK build completed and copied to mobile platforms"
