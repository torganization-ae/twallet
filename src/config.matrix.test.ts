// Smoke-test hardcoded TWallet brand constants after multi-brand axes were removed.

import {
  ACTIVE_TAB_STORAGE_KEY,
  APP_INSTALL_URL,
  APP_NAME,
  APP_PRIVACY_POLICY_URL,
  APP_PROMO_URL,
  APP_TERMS_OF_USE_URL,
  APP_WEBSITE_URL,
  GLOBAL_STATE_CACHE_KEY,
  PRODUCTION_URL,
  SHOULD_GENERATE_TON_MNEMONIC,
  SHOULD_SHOW_ALL_ASSETS_AND_ACTIVITY,
  TONCONNECT_WALLET_JSBRIDGE_KEY,
  WINDOW_PROVIDER_PORT,
} from './config';
import {
  SELF_PROTOCOL,
  SELF_UNIVERSAL_URLS,
  TONCONNECT_UNIVERSAL_URL,
} from './util/deeplink/constants';

describe('TWallet brand constants', () => {
  it('uses TWallet identity, domains, and full feature set', () => {
    expect(APP_NAME).toBe('TWallet');
    expect(GLOBAL_STATE_CACHE_KEY).toBe('twallet-global-state');
    expect(ACTIVE_TAB_STORAGE_KEY).toBe('twallet-active-tab');
    expect(TONCONNECT_WALLET_JSBRIDGE_KEY).toBe('twallet');
    expect(WINDOW_PROVIDER_PORT).toBe('Twallet_popup_reversed');
    expect(PRODUCTION_URL).toBe('https://web.twallet.ae');
    expect(APP_INSTALL_URL).toBe('https://wallet.tmail.ae/downloads');
    expect(APP_WEBSITE_URL).toBe('https://twallet.ae');
    expect(APP_PROMO_URL).toBe('https://twallet.ae/');
    expect(APP_TERMS_OF_USE_URL).toBe('https://twallet.ae/terms-of-use');
    expect(APP_PRIVACY_POLICY_URL).toBe('https://twallet.ae/privacy-policy');
    expect(SHOULD_GENERATE_TON_MNEMONIC).toBe(false);
    expect(SHOULD_SHOW_ALL_ASSETS_AND_ACTIVITY).toBe(false);
  });

  it('uses TWallet deeplink constants', () => {
    expect(SELF_PROTOCOL).toBe('twallet://');
    expect(TONCONNECT_UNIVERSAL_URL).toBe('https://connect.twallet.ae');
    expect(SELF_UNIVERSAL_URLS).toEqual(expect.arrayContaining(['https://my.tt']));
  });
});
