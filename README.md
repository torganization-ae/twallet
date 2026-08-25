
# twallet

Self-custodial multichain wallet based on [MyTonWallet](https://github.com/mytonwallet-org/mytonwallet).

This repository is an independent fork. It is **not** affiliated with, endorsed by, or maintained by the MyTonWallet team. Product names, trademarks, audits, ratings, support channels, and websites of MyTonWallet remain theirs.

## Origin and license

- **Upstream:** [mytonwallet-org/mytonwallet](https://github.com/mytonwallet-org/mytonwallet) ([mytonwallet.io](https://mytonwallet.io))
- **License:** [GNU General Public License v3.0](./LICENSE) (same as upstream)

This project redistributes and may modify GPL-licensed code from MyTonWallet. Copyright of the original work belongs to its respective authors. Modifications in this fork are likewise released under GPL-3.0. See [`LICENSE`](./LICENSE) for the full terms.

There is **no warranty**. Use at your own risk.

## Features (inherited codebase)

The upstream codebase provides a self-custodial wallet with support for multiple chains (including TON, Ethereum, Solana, TRON, and others), available as web, browser extension, desktop (Electron), native mobile, and Telegram Mini App targets. Exact feature set depends on how this fork is configured and built.

## For developers

### Requirements

Builds on **macOS** and **Linux**.

To build on **Windows**, you also need:

- A terminal with bash (Git Bash, MinGW, or Cygwin)
- A zip utility (used by some packaging commands)

### Local setup

```sh
cp .env.example .env

npm ci
```

`API_BASE_URL` in `.env` points the build at your own nexus deployment: it is used for the
backend/socket calls **and** re-points the default TON endpoints from `shared/networks.json`
(`/toncenter`, `/tonapiio`) plus the CSP `connect-src` allow-list. Leave it empty to keep the
built-in defaults. It is inlined at build time, so rebuild after changing it; endpoints already
overridden by hand in Settings → Networks keep winning over the default.

### Dev mode

```sh
npm run dev
```

### Upstream docs

Some developer docs live in the upstream repository:

- [Electron](https://github.com/mytonwallet-org/mytonwallet/blob/master/docs/electron.md)
- [Verifying GPG signatures](https://github.com/mytonwallet-org/mytonwallet/blob/master/docs/gpg-check.md)

### Linux desktop troubleshooting

**If the app does not start after click:**

Install the [FUSE 2 library](https://github.com/AppImage/AppImageKit/wiki/FUSE).

**If the app does not appear in the system menu or does not process `ton://` and TON Connect deeplinks:**

Install [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) and install the AppImage through it.

```bash
sudo add-apt-repository ppa:appimagelauncher-team/stable
sudo apt-get update
sudo apt-get install appimagelauncher
```

**If the app does not connect to Ledger:**

Copy the udev rules from the [official Ledger repository](https://github.com/LedgerHQ/udev-rules) and run `add_udev_rules.sh` with root rights.

```bash
git clone https://github.com/LedgerHQ/udev-rules
cd udev-rules
sudo bash ./add_udev_rules.sh
```

## Contributing

Pull requests are welcome. Please keep changes compatible with the GPL-3.0 license and preserve attribution to upstream where required.
