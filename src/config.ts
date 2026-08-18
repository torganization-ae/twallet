/* eslint-disable @stylistic/max-len */
import type { ApiTonWalletVersion } from './api/chains/ton/types';
import type {
  ApiBaseCurrency,
  ApiChain,
  ApiNftMarketplace,
  ApiSwapAsset,
  ApiSwapDexLabel,
  ApiToken,
} from './api/types';
import type { TOKEN_CARD_COLORS } from './components/main/helpers/cardColors';
import type { AutolockValueType, LangCode, LangItem, TokenPeriod } from './global/types';

export const APP_ENV = process.env.APP_ENV || 'production';

export const APP_NAME = process.env.APP_NAME || 'TWallet';
export const APP_VERSION = process.env.APP_VERSION!;
export const APP_COMMIT_HASH = process.env.APP_COMMIT_HASH!;
export const APP_ENV_MARKER = APP_ENV === 'staging' ? 'Beta' : APP_ENV === 'development' ? 'Dev' : undefined;
export const EXTENSION_NAME = 'TWallet • Crypto & Web3';
export const EXTENSION_DESCRIPTION = 'Self-custodial wallet for TON, TRON, Solana, Ethereum and more. Swap, stake, buy crypto, manage NFTs and explore dapps.';

export const DEBUG = APP_ENV !== 'production' && APP_ENV !== 'perf' && APP_ENV !== 'test';
export const DEBUG_MORE = false;
export const DEBUG_API = false;
export const DEBUG_VIEW_ACCOUNTS = false;
export const TEST_MNEMONIC = process.env.TEST_MNEMONIC?.trim();
export const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test';

export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_TEST = APP_ENV === 'test';
export const IS_PERF = APP_ENV === 'perf';
export const IS_EXTENSION = process.env.IS_EXTENSION === '1';
export const IS_FIREFOX_EXTENSION = process.env.IS_FIREFOX_EXTENSION === '1';
export const IS_OPERA_EXTENSION = process.env.IS_OPERA_EXTENSION === '1';
export const IS_PACKAGED_ELECTRON = process.env.IS_PACKAGED_ELECTRON === '1';
export const IS_ANDROID_DIRECT = process.env.IS_ANDROID_DIRECT === '1';
export const IS_AIR_APP = process.env.IS_AIR_APP === '1';
export const IS_TELEGRAM_APP = process.env.IS_TELEGRAM_APP === '1';
export const IS_EXPLORER = process.env.IS_EXPLORER === '1';

export const ELECTRON_HOST_URL = 'https://dumb-host';
export const INACTIVE_MARKER = '[Inactive]';
export const PRODUCTION_URL = 'https://web.twallet.ae';
export const BETA_URL = 'https://beta.twallet.ae';
// The pre-rebrand host still serves this very build - it is an extra domain of the same site, kept alive because
// outdated desktop clients poll it for update manifests. Listed explicitly rather than derived by negating
// PRODUCTION_URL, which would also match self-hosted installations.
export const LEGACY_APP_HOSTS = ['mytonwallet.app'];
// Where a legacy-host visitor is nudged to continue on the current brand. Opened via a plain anchor or `window.open`,
// never `openUrl`: `SUBPROJECT_URL_MASK` treats every `*.twallet.ae` host as a subproject, so `openUrl` would append
// the wallet context (addresses included) and open it in the in-app iframe browser - where the site renders blank
// under `X-Frame-Options: Deny`. `utm_source` attributes the migrated traffic.
export const NEW_APP_URL = `${PRODUCTION_URL}?utm_source=legacy_web`;
export const APP_INSTALL_URL = 'https://wallet.tmail.ae/downloads';
export const APP_REPO_URL = 'https://github.com/torganization-ae/twallet';
export const SELF_UNIVERSAL_HOST_URL = 'https://my.tt';
export const APP_WEBSITE_URL = 'https://twallet.ae';
export const APP_ICON_URL = 'https://twallet.ae/icon-512x512.png';

// GitHub workflow uses an empty string as the default value if it's not in repository variables, so we cannot define a default value here
export const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

export const SWAP_FEE_ADDRESS = process.env.SWAP_FEE_ADDRESS || 'UQDUkQbpTVIgt7v66-JTFR-3-eXRFz_4V66F-Ufn6vOg0GOp';
export const DIESEL_ADDRESS = process.env.DIESEL_ADDRESS || 'UQC9lQOaEHC6YASiJJ2NrKEOlITMMQmc8j0_iZEHy-4sl3tG';

export const STRICTERDOM_ENABLED = DEBUG && !IS_PACKAGED_ELECTRON;

export const DEBUG_ALERT_MSG = 'Shoot!\nSomething went wrong, please see the error details in Dev Tools Console.';

export const PIN_LENGTH = 4;
export const NATIVE_BIOMETRICS_USERNAME = 'Twallet';
export const NATIVE_BIOMETRICS_SERVER = 'https://web.twallet.ae';
export const NATIVE_BIOMETRICS_PROMPT_KEY = 'confirm an action in TWallet';

/**
 * If `true`, a wallet created by this build gets a TON-specific mnemonic, which can never derive a foreign address.
 * Generation only: importing a BIP39 phrase works on every build.
 */
export const SHOULD_GENERATE_TON_MNEMONIC = false;

export const MNEMONIC_COUNT = 24;
// Every build mints 24-word phrases, so 24 is offered first, while the 12-word BIP39 phrases minted by older
// builds (or other wallets) stay importable.
export const MNEMONIC_COUNTS = [24, 12];

export const PRIVATE_KEY_HEX_LENGTH = 64;
export const MNEMONIC_CHECK_COUNT = 3;

export const MOBILE_SCREEN_MAX_WIDTH = 700; // px

export const VIEW_TRANSITION_CLASS_NAME = 'active-view-transition';

export const ANIMATION_END_DELAY = 50;

export const ANIMATED_STICKER_TINY_ICON_PX = 16;
export const ANIMATED_STICKER_ICON_PX = 30;
export const ANIMATED_STICKER_TINY_SIZE_PX = 70;
export const ANIMATED_STICKER_SMALL_SIZE_PX = 110;
export const ANIMATED_STICKER_MIDDLE_SIZE_PX = 120;
export const ANIMATED_STICKER_DEFAULT_PX = 150;
export const ANIMATED_STICKER_BIG_SIZE_PX = 156;
export const ANIMATED_STICKER_HUGE_SIZE_PX = 192;

export const DEFAULT_PORTRAIT_WINDOW_SIZE = { width: 368, height: 770 };
export const DEFAULT_LANDSCAPE_WINDOW_SIZE = { width: 980, height: 788 };
export const TRANSACTION_ADDRESS_SHIFT = 4;

export const WHOLE_PART_DELIMITER = ' '; // https://www.compart.com/en/unicode/U+202F

export const DEFAULT_SLIPPAGE_VALUE = 5;

export const GLOBAL_STATE_CACHE_DISABLED = false;
export const GLOBAL_STATE_CACHE_KEY = IS_EXPLORER
  ? 'explorer-global-state'
  : 'twallet-global-state';

export const ANIMATION_LEVEL_MIN = 0;
export const ANIMATION_LEVEL_MED = 1;
export const ANIMATION_LEVEL_MAX = 2;
export const ANIMATION_LEVEL_DEFAULT = ANIMATION_LEVEL_MAX;
export const THEME_DEFAULT = 'system';

export const MAIN_ACCOUNT_ID = '0-ton-mainnet';
export const TEMPORARY_ACCOUNT_NAME = 'Wallet';

export const API_BASE_URL = process.env.API_BASE_URL || 'https://nexus-ton.testprojects.org';
export const PROXY_API_BASE_URL = process.env.PROXY_API_BASE_URL || 'https://server.twallet.ae/proxy';
/**
 * Our backend implements only a part of the `server.twallet.ae` contract so far — prices, the token
 * list and currency rates (see `SUPPORTED_PATHS_RE` in `api/common/backend.ts`). Everything else is
 * cut off and the features that depend on it are hidden — the same way on every platform.
 * Set to `false` once the whole contract is served.
 */
export const NO_BACKEND = true;
export const IPFS_GATEWAY_BASE_URL = 'https://ipfs.io/ipfs/';
export const SSE_BRIDGE_URL = process.env.TONCONNECT_BRIDGE_URL || 'https://bridge.tonapi.io/bridge/';

export const TON_CONNECT_ANALYTICS_URL = 'https://analytics.ton.org';

export const WALLET_CONNECT_BRIDGE_PATTERNS = 'https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org';

/** WalletConnect Pay API + collect iframe (multi-level subdomains; not covered by `*.walletconnect.com`). */
export const WALLET_CONNECT_PAY_CONNECT_ORIGINS = [
  'https://api.pay.walletconnect.com/',
  'https://api.pay.walletconnect.org/',
  'https://staging.api.pay.walletconnect.org/',
  'https://pay.walletconnect.com/',
];

export const WALLET_CONNECT_PAY_FRAME_ORIGINS = [
  'https://pay.walletconnect.com/',
];

export const WALLET_CONNECT_PROJECT_ID = process.env.WALLET_CONNECT_PROJECT_ID || '';
export const WALLET_CONNECT_PAY_APP_ID = process.env.WALLET_CONNECT_PAY_APP_ID || '';

export const SOLANA_GASLESS_PAYER_ADDRESS = process.env.SOLANA_GASLESS_PAYER_ADDRESS || 'BkVfRKjZnnYCcRBgXBsfaWFZFidBL9drm5MZwNqoNGCu';

export const FRACTION_DIGITS = 9;
export const SHORT_FRACTION_DIGITS = 2;

export const SUPPORT_USERNAME = 'mysupport';
export const MW_NEWS_CHANNEL_NAME: Partial<Record<LangCode, string>> = {
  en: 'MyWalletEng',
  ru: 'MyWalletRus',
};
export const MW_TIPS_CHANNEL_NAME: Partial<Record<LangCode, string>> = {
  en: 'MyTonWalletTips',
  ru: 'MyTonWalletTipsRu',
};
export const NFT_MARKETPLACE_TITLES: Record<ApiNftMarketplace, string> = {
  getgems: 'Getgems',
  fragment: 'Fragment',
  opensea: 'OpenSea',
};
export const APP_PROMO_URL = 'https://twallet.ae/';
export const APP_WEBSITE_HOST = 'twallet.ae';
export const APP_TERMS_OF_USE_URL = 'https://twallet.ae/terms-of-use';
export const APP_PRIVACY_POLICY_URL = 'https://twallet.ae/privacy-policy';
export const MY_WALLET_BLOG: Partial<Record<LangCode, string>> = {
  en: 'https://twallet.ae/en/blog/',
  ru: 'https://twallet.ae/ru/blog/',
};

export const MULTISEND_DAPP_URL = process.env.MULTISEND_DAPP_URL || 'https://multisend.twallet.ae/';

export const NFT_MARKETPLACE_URL = 'https://opensea.io/';
export const NFT_MARKETPLACE_TITLE = NFT_MARKETPLACE_TITLES.opensea;
export const TON_NFT_MARKETPLACE_URL = 'https://getgems.io/';
export const TON_NFT_MARKETPLACE_TITLE = NFT_MARKETPLACE_TITLES.getgems;
export const GETGEMS_BASE_MAINNET_URL = 'https://getgems.io/';
export const GETGEMS_BASE_TESTNET_URL = 'https://testnet.getgems.io/';
export const EMPTY_HASH_VALUE = 'NOHASH';

export const TMAIL_APP_URL = 'https://app.tmail.ae';

export const IFRAME_WHITELIST = [
  'http://localhost:*',
  'https://tonscan.org',
  'https://testnet.tonscan.org',
  'https://tonviewer.com',
  'https://testnet.tonviewer.com',
  'https://app.tmail.ae',
];
export const SUBPROJECT_URL_MASK = 'https://*.twallet.ae';

export const CEX_WAITING_DEADLINE = 3 * 60 * 60 * 1000; // 3 hours

export const PROXY_HOSTS = process.env.PROXY_HOSTS;

export const TINY_TRANSFER_MAX_COST = 0.01;

export const IMAGE_CACHE_NAME = IS_EXPLORER ? 'explorer-image' : 'twallet-image';
export const LANG_CACHE_NAME = 'twallet-lang-329';

export const LANG_LIST: LangItem[] = [{
  langCode: 'en',
  name: 'English',
  nativeName: 'English',
  rtl: false,
}, {
  langCode: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  rtl: false,
}, {
  langCode: 'ru',
  name: 'Russian',
  nativeName: 'Русский',
  rtl: false,
}, {
  langCode: 'zh-Hans',
  name: 'Chinese (Simplified)',
  nativeName: '简体',
  rtl: false,
}, {
  langCode: 'zh-Hant',
  name: 'Chinese (Traditional)',
  nativeName: '繁體',
  rtl: false,
}, {
  langCode: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  rtl: false,
}, {
  langCode: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  rtl: false,
}, {
  langCode: 'th',
  name: 'Thai',
  nativeName: 'ไทย',
  rtl: false,
}, {
  langCode: 'uk',
  name: 'Ukrainian',
  nativeName: 'Українська',
  rtl: false,
}, {
  langCode: 'pl',
  name: 'Polish',
  nativeName: 'Polski',
  rtl: false,
}];

// Blacklist-style feature flags (default unset = feature ON). Each is substituted at build time by
// `EnvironmentPlugin`, so it both drives Webpack dead-code elimination (drops code + npm deps) and is
// readable at runtime to silence behaviour/network for anything still bundled.
export const NO_TON = process.env.NO_TON === '1';
export const NO_TRON = process.env.NO_TRON === '1';
export const NO_SOLANA = process.env.NO_SOLANA === '1';
export const NO_EVM = process.env.NO_EVM === '1';
export const NO_WALLETCONNECT = process.env.NO_WALLETCONNECT === '1';
export const NO_SWAP = process.env.NO_SWAP === '1';
export const NO_PORTFOLIO = process.env.NO_PORTFOLIO === '1';
export const NO_MFA = process.env.NO_MFA === '1';
export const NO_LEDGER = process.env.NO_LEDGER === '1';
// TON-only build (default): hides the Networks settings page and drops every non-TON chain from
// the supported/display order, so nothing derives wallets for, polls or renders them. The
// multichain code stays in the repo — set `TON_ONLY=0` (as the tests do) to bring it back, and
// flip the NO_TRON/NO_SOLANA/NO_EVM webpack defaults to '0' so the SDKs are bundled again.
export const TON_ONLY = process.env.TON_ONLY !== '0';
export const VALIDATION_PERIOD_MS = 65_536_000; // 18.2 h.
export const ONE_TON = 1_000_000_000n;
export const DEFAULT_FEE = 15_000_000n; // 0.015 TON

/** Kept for activity decode / historical transaction classification */
export const LIQUID_POOL = 'EQD2_4d91M4TVbEBVyBF8J1UwpMJc361LKVCz6bBlffMW05o';
/** Kept for payload decode in metadata */
export const LIQUID_JETTON = 'EQCqC6EhRJ_tpWngKxL6dV0k6DSnRUrs9GSVkLbfdCqsj6TE';

const LEGACY_NOMINATORS_STAKING_POOL = 'Ef8dgIOIRyCLU0NEvF8TD6Me3wrbrkS1z3Gpjk3ppd8m8-s_';
const DEFAULT_NOMINATORS_STAKING_POOL = 'Ef84o4VJRnlp1wsqSHov1QttqSTQda2Z1vGK-b7EaPQoeJMx';

/** Historical staking pool addresses used only for activity classification */
const HISTORICAL_STAKING_POOLS = [
  LEGACY_NOMINATORS_STAKING_POOL,
  'Ef-WMmizoLk4CvqTKs-mDrGJwW4fiH5zVd4SaHih7PObxP_0',
  'Ef9KkdMtAom9qYE64A_3ZA5sOP3OduRYPdavxGO3DH12fF5g',
  'Ef9-8keOeXR4Sn-ywrlFgxma4ubJvEFRW3jgP0ib16A-HCiG',
  DEFAULT_NOMINATORS_STAKING_POOL,
  'Ef_CbvHoa5imR1x_ESkUT_6NJQoONbSGp8MkrAu1xtM6NOxE',
  'Ef-j7wmnLdy54kZC0gtbVbCrdPA4cFLr3rxLOoDcpzR_SyBX',
];

export const TONCONNECT_PROTOCOL_VERSION = 2;
export const TONCONNECT_WALLET_JSBRIDGE_KEY = 'twallet';
export const EMBEDDED_DAPP_BRIDGE_CHANNEL = 'embedded-dapp-bridge';

export const NFT_FRAGMENT_COLLECTIONS = [
  '0:0e41dc1dc3c9067ed24248580e12b3359818d83dee0304fabcf80845eafafdb2', // Anonymous Telegram Numbers
  '0:80d78a35f955a14b679faa887ff4cd5bfc0f43b4a4eea2a7e6927f3701b273c2', // Telegram Usernames
];
export const NFT_FRAGMENT_GIFT_IMAGE_TO_URL_REGEX = /^https?:\/\/nft\.(fragment\.com\/gift\/[\w-]+-\d+)\.\w+$/i;
export const TELEGRAM_GIFTS_SUPER_COLLECTION = 'super:telegram-gifts';

export const TON_DNS_RENEWAL_WARNING_DAYS = 14;
export const TON_DNS_RENEWAL_NFT_WARNING_DAYS = 30;

export const TONCOIN = {
  name: 'Gram',
  symbol: 'GRAM',
  slug: 'toncoin',
  decimals: 9,
  chain: 'ton',
  cmcSlug: 'toncoin',
  priceUsd: 1.5,
} as const;

export const TRX = {
  name: 'TRON',
  symbol: 'TRX',
  slug: 'trx',
  decimals: 6,
  chain: 'tron',
  cmcSlug: 'tron',
} as const;

export const SOLANA = {
  name: 'Solana',
  symbol: 'SOL',
  slug: 'sol',
  decimals: 9,
  chain: 'solana',
  cmcSlug: 'solana',
} as const;

export const ETH = {
  name: 'Ethereum',
  symbol: 'ETH',
  slug: 'eth',
  decimals: 18,
  chain: 'ethereum',
} as const;

export const BASE = {
  name: 'Base',
  symbol: 'ETH',
  slug: 'base',
  decimals: 18,
  chain: 'base',
  label: 'Base',
} as const;

export const BNB = {
  name: 'BNB',
  symbol: 'BNB',
  slug: 'bnb',
  decimals: 18,
  chain: 'bnb',
} as const;

export const POLYGON = {
  name: 'Polygon',
  symbol: 'POL',
  slug: 'pol',
  decimals: 18,
  chain: 'polygon',
} as const;

export const ARBITRUM = {
  name: 'Arbitrum',
  symbol: 'ETH',
  slug: 'arb',
  decimals: 18,
  chain: 'arbitrum',
  label: 'Arbitrum',
} as const;

export const MONAD = {
  name: 'Monad',
  symbol: 'MON',
  slug: 'mon',
  decimals: 18,
  chain: 'monad',
} as const;

export const AVALANCHE = {
  name: 'Avalanche',
  symbol: 'AVAX',
  slug: 'ava',
  decimals: 18,
  chain: 'avalanche',
} as const;

export const HYPERLIQUID = {
  name: 'Hyperliquid',
  symbol: 'HYPE',
  slug: 'hyperliquid',
  decimals: 18,
  chain: 'hyperliquid',
} as const;

export const MYCOIN_MAINNET = {
  name: 'My Wallet Coin',
  symbol: 'MY',
  slug: 'ton-eqcfvnlrbn',
  decimals: 9,
  chain: 'ton',
  minterAddress: 'EQCFVNlRb-NHHDQfv3Q9xvDXBLJlay855_xREsq5ZDX6KN-w',
  image: 'https://mytonwallet.io/logo-256-blue.png',
} as const;

export const MYCOIN_TESTNET = {
  ...MYCOIN_MAINNET,
  slug: 'ton-kqawlxpebw',
  minterAddress: 'kQAWlxpEbwhCDFX9gp824ee2xVBhAh5VRSGWfbNFDddAbQoQ',
  image: undefined,
} as const;

export const STAKED_TON_SLUG = 'ton-eqcqc6ehrj';
export const STAKED_MYCOIN_SLUG = 'ton-eqcbzvsfwq';
/** Historical pool address used only for activity classification */
export const MYCOIN_STAKING_POOL = 'EQC3roTiRRsoLzfYVK7yVVoIZjTEqAjQU3ju7aQ7HWTVL5o5';
/** Historical vault address used only for activity classification */
export const ETHENA_STAKING_VAULT = 'EQChGuD1u0e7KUWHH5FaYh_ygcLXhsdG2nSHPXHW8qqnpZXW';

export const STON_PTON_ADDRESS = 'EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez';
export const STON_PTON_SLUG = 'ton-eqcm3b12qk';

export const DNS_IMAGE_GEN_URL = '';

export const TRC20_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  chain: 'tron',
  slug: 'tron-tr7nhqjekq',
  tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  label: 'TRC-20',
} as const;

export const TRC20_USDT_TESTNET = {
  ...TRC20_USDT_MAINNET,
  slug: 'tron-tg3xxyexbk',
  tokenAddress: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
};

export const TON_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USD₮',
  chain: 'ton',
  slug: 'ton-eqcxe6mutq',
  decimals: 6,
  tokenAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  image: 'https://tether.to/images/logoCircle.png',
  label: 'TON',
  priceUsd: 1,
} as const;

// Where to get this token: https://t.me/testgiver_ton_usdt_bot
export const TON_USDT_TESTNET = {
  ...TON_USDT_MAINNET,
  slug: 'ton-kqd0gkbm8z',
  tokenAddress: 'kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy',
  image: undefined,
} as const;

export const TON_USDE = {
  name: 'Ethena USDe',
  symbol: 'USDe',
  chain: 'ton',
  tokenAddress: 'EQAIb6KmdfdDR7CN1GBqVJuP25iCnLKCvBlJ07Evuu2dzP5f',
  slug: 'ton-eqaib6kmdf',
  decimals: 6,
  image: 'https://imgproxy.toncenter.com/binMwUmcnFtjvgjp4wSEbsECXwfXUwbPkhVvsvpubNw/pr:small/aHR0cHM6Ly9tZXRhZGF0YS5sYXllcnplcm8tYXBpLmNvbS9hc3NldHMvVVNEZS5wbmc',
} as const;

export const TON_TSUSDE = {
  name: 'Ethena tsUSDe',
  symbol: 'tsUSDe',
  chain: 'ton',
  tokenAddress: 'EQDQ5UUyPHrLcQJlPAczd_fjxn8SLrlNQwolBznxCdSlfQwr',
  slug: 'ton-eqdq5uuyph',
  decimals: 6,
  image: 'https://cache.tonapi.io/imgproxy/vGZJ7erwsWPo7DpVG_V7ygNn7VGs0szZXcNLHB_l0ms/rs:fill:200:200:1/g:no/aHR0cHM6Ly9tZXRhZGF0YS5sYXllcnplcm8tYXBpLmNvbS9hc3NldHMvdHNVU0RlLnBuZw.webp',
} as const;

export const SOLANA_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  chain: 'solana',
  slug: 'solana-es9vmfrzac',
  tokenAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  label: 'SOL',
  image: 'https://tether.to/images/logoCircle.png',
  priceUsd: 1,
} as const;

export const SOLANA_USDC_MAINNET = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  chain: 'solana',
  slug: 'solana-epjfwdd5au',
  tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  label: 'SOL',
  image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  priceUsd: 1,
} as const;

export const ETH_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  chain: 'ethereum',
  slug: 'ethereum-0xdac17f95',
  tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  label: 'ERC-20',
  image: 'https://tether.to/images/logoCircle.png',
  priceUsd: 1,
} as const;

export const ETH_USDC_MAINNET = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  chain: 'ethereum',
  slug: 'ethereum-0xa0b86991',
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  label: 'ERC-20',
  image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  priceUsd: 1,
} as const;

export const BASE_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  chain: 'base',
  slug: 'base-0xfde4c96c',
  tokenAddress: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  label: 'ERC-20',
  image: 'https://tether.to/images/logoCircle.png',
  priceUsd: 1,
} as const;

export const BASE_USDC_MAINNET = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  chain: 'base',
  slug: 'base-0x833589fc',
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  label: 'ERC-20',
  image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  priceUsd: 1,
} as const;

export const ARBITRUM_USDC_MAINNET = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  chain: 'arbitrum',
  slug: 'arbitrum-0xaf88d065',
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  label: 'ERC-20',
  image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  priceUsd: 1,
} as const;

export const BSC_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 18,
  chain: 'bnb',
  slug: 'bnb-0x55d39832',
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  label: 'BEP-20',
  image: 'https://tether.to/images/logoCircle.png',
  priceUsd: 1,
} as const;

export const AVALANCHE_USDT_MAINNET = {
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  chain: 'avalanche',
  slug: 'avalanche-0x9702230a',
  tokenAddress: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
  label: 'ERC-20',
  image: 'https://tether.to/images/logoCircle.png',
  priceUsd: 1,
} as const;

export const HYPERLIQUID_USDC_MAINNET = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  chain: 'hyperliquid',
  slug: 'hyperliquid-0xb88339cb',
  tokenAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
  label: 'ERC-20',
  image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  priceUsd: 1,
} as const;

/** The properties not returned by the backend, and therefore not stored in token objects */
export const TOKEN_CUSTOM_STYLES: Partial<Record<string, {
  fontIcon?: string;
  cardColor?: keyof typeof TOKEN_CARD_COLORS;
}>> = {
  [TONCOIN.slug]: {
    fontIcon: 'icon-chain-ton',
    cardColor: 'blue',
  },
  [TRX.slug]: {
    fontIcon: 'icon-chain-tron',
    cardColor: 'red',
  },
  [SOLANA.slug]: {
    fontIcon: 'icon-chain-solana',
    cardColor: 'purple',
  },
  [ETH.slug]: {
    fontIcon: 'icon-chain-ethereum',
    cardColor: 'purple',
  },
  [BASE.slug]: {
    fontIcon: 'icon-chain-base',
    cardColor: 'blue',
  },
  [STAKED_TON_SLUG]: {
    cardColor: 'green',
  },
};

/** Historical staking counterparty addresses for activity classification */
export const ALL_STAKING_POOLS = [
  LIQUID_POOL,
  ...HISTORICAL_STAKING_POOLS,
  MYCOIN_STAKING_POOL,
  ETHENA_STAKING_VAULT,
  TON_TSUSDE.tokenAddress,
];

// Native tokens in the UI display order (see CHAIN_DISPLAY_ORDER). Drives the empty-wallet token order.
export const PRIORITY_TOKENS = [
  ETH,
  SOLANA,
  HYPERLIQUID,
  TONCOIN,
  TRX,
  BASE,
  BNB,
  POLYGON,
  AVALANCHE,
  ARBITRUM,
  MONAD,
] as ApiToken[];

export const INIT_SWAP_ASSETS: Record<'in' | 'out', ApiSwapAsset> = {
  in: {
    ...TONCOIN,
    isPopular: true,
  },
  out: {
    ...TON_USDT_MAINNET,
    isPopular: true,
  },
};

/**
 * The fixed "Popular" section of the swap token selector, in display order. Prices are not fetched for these:
 * whatever the token registry already knows is used, the rest show zeros until the user holds the token.
 */
export const POPULAR_SWAP_TOKENS: Omit<ApiSwapAsset, 'isPopular' | 'priceUsd'>[] = [
  {
    name: TONCOIN.name, symbol: TONCOIN.symbol, slug: TONCOIN.slug, decimals: TONCOIN.decimals, chain: 'ton',
  },
  {
    name: TON_USDT_MAINNET.name,
    symbol: TON_USDT_MAINNET.symbol,
    slug: TON_USDT_MAINNET.slug,
    decimals: TON_USDT_MAINNET.decimals,
    chain: 'ton',
    tokenAddress: TON_USDT_MAINNET.tokenAddress,
    image: TON_USDT_MAINNET.image,
    label: TON_USDT_MAINNET.label,
  },
  {
    name: 'DeDust',
    symbol: 'DUST',
    slug: 'ton-eqblqsm144',
    decimals: 9,
    chain: 'ton',
    tokenAddress: 'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE',
    // The DeDust asset list still calls this token Scaleton and points at a dead `scale.png`
    image: 'https://assets.dedust.io/images/dust.gif',
  },
  {
    name: 'STON',
    symbol: 'STON',
    slug: 'ton-eqa2kcvnwv',
    decimals: 9,
    chain: 'ton',
    tokenAddress: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
    image: 'https://static.ston.fi/logo/ston_symbol.png',
  },
  {
    name: 'Utya',
    symbol: 'UTYA',
    slug: 'ton-eqbacguwoo',
    decimals: 9,
    chain: 'ton',
    tokenAddress: 'EQBaCgUwOoc6gHCNln_oJzb0mVs79YG7wYoavh-o1ItaneLA',
    image: 'https://x-xoxox.github.io/utya/256.png',
  },
  {
    name: 'STORM',
    symbol: 'STORM',
    slug: 'ton-eqbsosmczr',
    decimals: 9,
    chain: 'ton',
    tokenAddress: 'EQBsosmcZrD6FHijA7qWGLw5wo_aH8UN435hi935jJ_STORM',
    image: 'https://static.storm.tg/TOKEN.png',
  },
  {
    name: MYCOIN_MAINNET.name,
    symbol: MYCOIN_MAINNET.symbol,
    slug: MYCOIN_MAINNET.slug,
    decimals: MYCOIN_MAINNET.decimals,
    chain: 'ton',
    tokenAddress: MYCOIN_MAINNET.minterAddress,
    image: MYCOIN_MAINNET.image,
  },
  {
    name: 'Grm',
    symbol: 'GRM',
    slug: 'ton-eqc47093ox',
    decimals: 9,
    chain: 'ton',
    tokenAddress: 'EQC47093oX5Xhb0xuk2lCr2RhS8rj-vul61u4W2UH5ORmG_O',
    image: 'https://gramcoin.org/img/icon.png',
  },
];

export const DEFAULT_SWAP_FIRST_TOKEN_SLUG = TONCOIN.slug;
export const DEFAULT_SWAP_SECOND_TOKEN_SLUG = TON_USDT_MAINNET.slug;
export const DEFAULT_SWAP_AMOUNT = '10';
export const DEFAULT_TRANSFER_TOKEN_SLUG = TONCOIN.slug;

export const SWAP_DEX_LABELS: Record<ApiSwapDexLabel, string> = {
  dedust: 'DeDust',
  ston: 'STON.fi',
  jupiter: 'Jupiter',
};

export const ACTIVE_TAB_STORAGE_KEY = IS_EXPLORER
  ? 'explorer-active-tab'
  : 'twallet-active-tab';

export const INDEXED_DB_NAME = IS_EXPLORER ? 'explorer-keyval-store' : 'keyval-store';
export const INDEXED_DB_STORE_NAME = 'keyval';

export const WINDOW_PROVIDER_CHANNEL = 'windowProvider';
export const WINDOW_PROVIDER_PORT = 'Twallet_popup_reversed';

export const SHOULD_SHOW_ALL_ASSETS_AND_ACTIVITY = false;

export const DEFAULT_PRICE_CURRENCY = 'USD';
export const CURRENCIES: Record<
  ApiBaseCurrency,
  // Get the fallback rates at https://server.twallet.ae/currency-rates
  { name: string; decimals: number; shortSymbol?: string; shortSymbolPosition?: 'start' | 'end'; fallbackRate: string }
> = {
  USD: {
    name: 'US Dollar',
    decimals: 2,
    shortSymbol: '$',
    fallbackRate: '1',
  },
  EUR: {
    name: 'Euro',
    decimals: 2,
    shortSymbol: '€',
    fallbackRate: '0.85233500',
  },
  RUB: {
    name: 'Russian Ruble',
    decimals: 2,
    shortSymbol: '₽',
    fallbackRate: '84.49824600',
  },
  CNY: {
    name: 'Chinese Yuan',
    decimals: 2,
    shortSymbol: '¥',
    fallbackRate: '7.11865000',
  },
  BTC: {
    name: 'Bitcoin',
    decimals: 9,
    fallbackRate: '0.00000866',
  },
  TON: {
    name: 'Gram',
    decimals: 9,
    shortSymbol: 'GRAM',
    shortSymbolPosition: 'end',
    fallbackRate: '0.31360000',
  },
};

export const BURN_ADDRESS = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

export const DEFAULT_WALLET_VERSION: ApiTonWalletVersion = 'W5';
export const POPULAR_WALLET_VERSIONS: readonly ApiTonWalletVersion[] = ['v3R1', 'v3R2', 'v4R2', 'W5'];

export const DEFAULT_TIMEOUT = 10000;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_ERROR_PAUSE = 500;

export const HISTORY_PERIODS: TokenPeriod[] = ['1D', '7D', '1M', '3M', '1Y', 'ALL'];

export const BROWSER_HISTORY_LIMIT = 10;

export const NFT_BATCH_SIZE = 4;
export const NOTCOIN_VOUCHERS_ADDRESS = 'EQDmkj65Ab_m0aZaW8IpKw4kYqIgITw_HRstYEkVQ6NIYCyW';
export const BURN_CHUNK_DURATION_APPROX_SEC = 30;
export const NOTCOIN_FORWARD_TON_AMOUNT = 30000000n; // 0.03 TON
export const NOTCOIN_EXCHANGERS = [
  'EQAPZauWVPUcm2hUJT9n36pxznEhl46rEn1bzBXN0RY_yiy2',
  'EQASgm0Qv3h2H2mF0W06ikPqYq2ctT3dyXMJH_svbEKKB3iZ',
  'EQArlmP-RhVIG2yAFGZyPZfM3m0YccxmpvoRi6sgRzWnAA0s',
  'EQA6pL-spYqZp1Ck6o3rpY45Cl-bvLMW_j3qdVejOkUWpLnm',
  'EQBJ_ehYjumQKbXfWUue1KHKXdTm1GuYJB0Fj2ST_DwORvpd',
  'EQBRmYSjxh9xlZpUqEmGjF5UjukI9v_Cm2kCTu4CoBn3XkOD',
  'EQBkiqncd7AFT5_23H-RoA2Vynk-Nzq_dLoeMVRthAU9RF0p',
  'EQB_OzTHXbztABe0QHgr4PtAV8T64LR6aDunXgaAoihOdxwO',
  'EQCL-x5kLg6tKVNGryItTuj6tG3FH5mhUEu0xRqQc-kbEmbe',
  'EQCZh2yJ46RaQH3AYmjEA8SMMXi77Oein4-3lvqkHseIAhD-',
  'EQChKo5IK3iNqUHUGDB9gtzjCjMTPtmsFqekuCA2MdreVEyu',
  'EQC6DNCBv076TIliRMfOt20RpbS7rNKDfSky3WrFEapFt8AH',
  'EQDE_XFZOYae_rl3ZMsgBCtRSmYhl8B4y2BZEP7oiGBDhlgy',
  'EQDddqpGA2ePXQF47A2DSL3GF6ZzIVmimfM2d16cdymy2noT',
  'EQDv0hNNAamhYltCh3pTJrq3oRB9RW2ZhEYkTP6fhj5BtZNu',
  'EQD2mP7zgO7-imUJhqYry3i07aJ_SR53DaokMupfAAobt0Xw',
] as const;

export const CLAIM_ADDRESS = 'EQB3zOTvPi1PmwdcTpqSfFKZnhi1GNKEVJM-LdoAirdLtash';
export const CLAIM_AMOUNT = 30000000n; // 0.03 TON
export const CLAIM_COMMENT = 'claim';

export const RE_LINK_TEMPLATE = /((ftp|https?):\/\/)?(?<host>(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z][-a-zA-Z0-9]{1,62})\b([-a-zA-Z0-9()@:%_+.,~#?&/=]*)/g;

export const RE_TG_BOT_MENTION = /(telegram|tg)[:\s-]*@[a-z0-9_]+|(https?:\/\/)?(t\.me|telegram\.me|telegram\.dog)\/[a-z0-9_]+/mi;

export const AUTOLOCK_OPTIONS_LIST = [
  {
    value: 'never',
    name: 'Disabled',
    selectedName: 'Disabled',
    period: 0,
  },
  {
    value: '1',
    name: '30 seconds',
    selectedName: 'If away for 30 sec',
    period: 30_000,
  },
  {
    value: '2',
    name: '3 minutes',
    selectedName: 'If away for 3 min',
    period: 60_000 * 3,
  },
  {
    value: '3',
    name: '10 minutes',
    selectedName: 'If away for 10 min',
    period: 60_000 * 10,
  },
] as const;

export const AUTO_CONFIRM_DURATION_MINUTES = 5;

export const PRICELESS_TOKEN_HASHES = new Set([
  '173e31eee054cb0c76f77edc7956bed766bf48a1f63bd062d87040dcd3df700f', // FIVA SY tsTON EQAxGi9Al7hamLAORroxGkvfap6knGyzI50ThkP3CLPLTtOZ
  '5226dd4e6db9af26b24d5ca822bc4053b7e08152f923932abf25030c7e38bb42', // FIVA PT tsTON EQAkxIRGXgs2vD2zjt334MBjD3mXg2GsyEZHfzuYX_trQkFL
  'fea2c08a704e5192b7f37434927170440d445b87aab865c3ea2a68abe7168204', // FIVA YT tsTON EQAcy60qg22RCq87A_qgYK8hooEgjCZ44yxhdnKYdlWIfKXL
  'e691cf9081a8aeb22ed4d94829f6626c9d822752e035800b5543c43f83d134b5', // FIVA LP tsTON EQD3BjCjxuf8mu5kvxajVbe-Ila1ScZZlAi03oS7lMmAJjM3
  '301ce25925830d713b326824e552e962925c4ff45b1e3ea21fc363a459a49b43', // FIVA SY eUSDT EQDi9blCcyT-k8iMpFMYY0t7mHVyiCB50ZsRgyUECJDuGvIl
  '02250f83fbb8624d859c2c045ac70ee2b3b959688c3d843aec773be9b36dbfc3', // FIVA PT eUSDT EQBzVrYkYPHx8D_HPfQacm1xONa4XSRxl826vHkx_laP2HOe
  'dba3adb2c917db80fd71a6a68c1fc9e12976491a8309d5910f9722efc084ce4d', // FIVA YT eUSDT EQCwUSc2qrY5rn9BfFBG9ARAHePTUvITDl97UD0zOreWzLru
  '7da9223b90984d6a144e71611a8d7c65a6298cad734faed79438dc0f7a8e53d1', // FIVA LP eUSDT EQBNlIZxIbQGQ78cXgG3VRcyl8A0kLn_6BM9kabiHHhWC4qY
  'ddf80de336d580ab3c11d194f189c362e2ca1225cae224ea921deeaba7eca818', // tsUSDe EQDQ5UUyPHrLcQJlPAczd_fjxn8SLrlNQwolBznxCdSlfQwr
  'eb9d9891a32ec94425c09735f6ade73f4c171da0091f874d6e9d25247d583990', // Affluent TON Lending Vault EQADQ6JcK0NMuNM5uwCcS9bjcn2RTvcxYIZjNlhIhywUrfBN
  'f66c149de251ffd031bdb34b79abe43a062ba16b815433691e3ec40a77f01d71', // Affluent Ethena Multiply Vault EQDXmtbt1-WSP00tSh6N6FH-4lX7LbnrjORClmtmuZqg4Ymm
  'bca42dbdcbc0d885aaffb1eeeb027d9f338c2dd68701a05641c1d1c3171a7400', // Affluent TON Multiply Vault EQDtxQqkgIRQQR5hWlrQxiJMtLwjR3rEYNUBbEcvPDwCs1Ng
]);

export const DEFAULT_OUR_SWAP_FEE = 0.875;
export const MW_AGGREGATOR_QUERY_ID = '4246015164496276000';

export const SWAP_API_VERSION = 3;
export const TONCENTER_ACTIONS_VERSION = 'v1';

export const JVAULT_URL = 'https://jvault.xyz';

export const HELP_CENTER_URL = {
  home: {
    en: 'https://help.twallet.ae/',
    ru: 'https://help.twallet.ae/ru',
  },
  domainScam: {
    en: 'https://help.twallet.ae/intro/scams/.ton-domain-scams',
    ru: 'https://help.twallet.ae/ru/baza-znanii/moshennichestvo-i-skamy/moshennichestvo-s-ispolzovaniem-domenov-.ton',
  },
  seedScam: {
    en: 'https://help.twallet.ae/intro/scams/leaked-seed-phrases',
    ru: 'https://help.twallet.ae/ru/baza-znanii/moshennichestvo-i-skamy/slitye-sid-frazy',
  },
};

const ALL_TON_DNS_ZONES = [
  {
    suffixes: ['ton'],
    baseFormat: /^([-\da-z]+\.){0,2}[-\da-z]{4,126}$/i,
    resolver: 'EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz',
    collectionName: 'TON DNS Domains',
    isUnofficial: false,
    isRenewable: true,
    isLinkable: true,
    isTelemint: false,
  },
  {
    suffixes: ['t.me'],
    baseFormat: /^([-\da-z]+\.){0,2}[-_\da-z]{4,32}$/i,
    resolver: 'EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi',
    collectionName: 'Telegram Usernames',
    isUnofficial: false,
    isRenewable: false,
    isLinkable: true,
    isTelemint: true,
  },
  {
    suffixes: ['vip', 'ton.vip', 'vip.ton'],
    baseFormat: /^([-\da-z]+\.){0,2}[\da-z]{1,24}$/i,
    resolver: 'EQBWG4EBbPDv4Xj7xlPwzxd7hSyHMzwwLB5O6rY-0BBeaixS',
    collectionName: 'VIP DNS Domains',
    isUnofficial: true,
    isRenewable: false,
    isLinkable: true,
    isTelemint: false,
  },
  {
    suffixes: ['grm'],
    baseFormat: /^([-\da-z]+\.){0,2}[-\da-z]{1,127}$/i,
    resolver: 'EQAic3zPce496ukFDhbco28FVsKKl2WUX_iJwaL87CBxSiLQ',
    collectionName: 'GRAM DNS Domains',
    isUnofficial: true,
    isRenewable: false,
    isLinkable: true,
    isTelemint: false,
  },
] as const;

export const TON_DNS_ZONES = ALL_TON_DNS_ZONES;

export const RENEWABLE_TON_DNS_COLLECTIONS = new Set<string>(
  TON_DNS_ZONES.filter((zone) => zone.isRenewable).map((zone) => zone.resolver),
);

export const TMAIL_DNS_COLLECTION_ADDRESS = 'EQDPcCeltOvzIsxKWWwf08gUoGPh37ZzOSxKqhAPWTQi-VQc';
export const TMAIL_DOMAIN_SUFFIX = '@tmail.ton';
// Web2-style alias domain that maps 1:1 onto the web3 `@tmail.ton` alias (same local part, different suffix).
export const TMAIL_DOMAIN_ALT_SUFFIX = '@tmail.ae';
export const TMAIL_ALIAS_REGEX = /^[a-z0-9]([-_+a-z0-9]{0,62}[a-z0-9])?$/;

export const DEFAULT_AUTOLOCK_OPTION: AutolockValueType = '3';
export const WRONG_ATTEMPTS_BEFORE_LOG_OUT_SUGGESTION = 2;

export const UNKNOWN_TOKEN = {
  symbol: '[Unknown]',
  decimals: 9,
} as const;

export const DEFAULT_CHAIN: ApiChain = 'ton';

export const MFA_BOT_URL = process.env.MFA_BOT_URL || 'https://t.me/tgmfabot/auth';
export const MFA_API_BASE_URL = process.env.MFA_API_BASE_URL || '';
export const MFA_MASTER_ADDRESS = 'UQCIoyc951J4hQwboW1-Gbt0kK0z920N2y8GbNXqCzWqe2ds';
export const MFA_EXTENSION_CODE_HASH = '701eede652337f699550cc51cb15263259aae6fc6eba976237945f142dda982d';
