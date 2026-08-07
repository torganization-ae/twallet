#!/usr/bin/env bash
# Validate shared/networks.json and that mobile platforms ship the same file.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/shared/networks.json"

if [[ ! -f "$SHARED" ]]; then
  echo "error: missing $SHARED" >&2
  exit 1
fi

python3 - "$SHARED" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
assert "chainOrder" in data and "displayOrder" in data and "chains" in data
order = set(data["chainOrder"])
display = set(data["displayOrder"])
chains = set(data["chains"].keys())
if order != display:
    raise SystemExit(f"chainOrder/displayOrder mismatch: {order ^ display}")
if order != chains:
    raise SystemExit(f"chainOrder/chains mismatch: {order ^ chains}")
for chain, cfg in data["chains"].items():
    for net in ("mainnet", "testnet"):
        ep = cfg["endpoints"][net]
        if "rpc" not in ep or "api" not in ep:
            raise SystemExit(f"{chain}.{net}: missing rpc/api")
        if cfg["defaultEnabled"][net] and not ep["rpc"]:
            raise SystemExit(f"{chain}.{net}: defaultEnabled but empty rpc")
print(f"ok: {len(chains)} chains in {path}")
PY

ANDROID_TW="$ROOT/mobile/android/app/src/twallet/assets/networks.json"
ANDROID_GRAM="$ROOT/mobile/android/app/src/twalletgram/assets/networks.json"
IOS_RES="$ROOT/mobile/ios/Air/SubModules/WalletResources/Resources/networks.json"

for copy in "$ANDROID_TW" "$ANDROID_GRAM" "$IOS_RES"; do
  if [[ ! -f "$copy" ]]; then
    echo "error: missing platform copy $copy" >&2
    exit 1
  fi
  if ! cmp -s "$SHARED" "$copy"; then
    echo "error: $copy differs from shared/networks.json — re-copy required" >&2
    exit 1
  fi
done

echo "ok: platform copies match shared/networks.json"
