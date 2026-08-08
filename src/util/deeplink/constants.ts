import { IS_TWALLETGRAM_WALLET } from '../../config';

export const TON_PROTOCOL = 'ton://';
export const TONCONNECT_PROTOCOL = 'tc://';
export const TONCONNECT_PROTOCOL_SELF = IS_TWALLETGRAM_WALLET ? 'twalletgram-tc://' : 'twallet-tc://';
export const SELF_PROTOCOL = IS_TWALLETGRAM_WALLET ? 'twalletgram://' : 'twallet://';
export const SELF_UNIVERSAL_URLS = IS_TWALLETGRAM_WALLET
  ? ['https://go.gramwallet.io']
  : ['https://my.tt', 'https://go.mytonwallet.org'];
export const TONCONNECT_UNIVERSAL_URL = IS_TWALLETGRAM_WALLET
  ? 'https://connect.gramwallet.io'
  : 'https://connect.mytonwallet.org';
export const CHECKIN_URL = 'https://checkin.mytonwallet.org';
export const WALLETCONNECT_PROTOCOL = 'wc:';
export const WALLETCONNECT_DEEPLINK = IS_TWALLETGRAM_WALLET ? 'twalletgram-wc://' : 'twallet-wc://';
export const WALLETCONNECT_UNIVERSAL_URLS = IS_TWALLETGRAM_WALLET
  ? ['https://connect.gramwallet.io/wc']
  : ['https://connect.mywallet.io/wc', 'https://connect.mytonwallet.org/wc'];
