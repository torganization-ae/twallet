import {
  getTmailAliasBase, isBareTonAlias, isTmailAlias, normalizeTmailDomain, parseTmailShareQr,
} from './tmail';

describe('normalizeTmailDomain', () => {
  it('rewrites the @tmail.ae suffix to @tmail.ton', () => {
    expect(normalizeTmailDomain('alice@tmail.ae')).toBe('alice@tmail.ton');
    expect(normalizeTmailDomain('Alice@TMail.AE')).toBe('alice@tmail.ton');
  });

  it('leaves other domains untouched (only trims/lowercases)', () => {
    expect(normalizeTmailDomain(' Alice@Tmail.Ton ')).toBe('alice@tmail.ton');
    expect(normalizeTmailDomain('example.ton')).toBe('example.ton');
  });
});

describe('isTmailAlias', () => {
  it('accepts both @tmail.ton and @tmail.ae', () => {
    expect(isTmailAlias('alice@tmail.ton')).toBe(true);
    expect(isTmailAlias('alice@tmail.ae')).toBe(true);
    expect(isTmailAlias('Alice@TMail.AE')).toBe(true);
  });

  it('rejects unrelated domains', () => {
    expect(isTmailAlias('alice@tmail.com')).toBe(false);
    expect(isTmailAlias('alice@example.ton')).toBe(false);
  });
});

describe('isBareTonAlias', () => {
  it('accepts a short handle', () => {
    expect(isBareTonAlias('alice')).toBe(true);
    expect(isBareTonAlias('Alice')).toBe(true);
  });

  it('rejects real chain addresses instead of treating them as an alias', () => {
    // TON user-friendly (48 chars, case-sensitive)
    expect(isBareTonAlias('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N')).toBe(false);
    // EVM checksummed
    expect(isBareTonAlias('0x55712bf80d1370183f78dd995e38fb99fbeca06f')).toBe(false);
    // Solana base58
    expect(isBareTonAlias('2xmoSUHGovXAmxeYVGEH6mWme5ECpDvxQ6PVkmi3wqa2')).toBe(false);
    // Tron base58
    expect(isBareTonAlias('TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf')).toBe(false);
  });

  it('rejects values containing "." or "@"', () => {
    expect(isBareTonAlias('alice.ton')).toBe(false);
    expect(isBareTonAlias('alice@tmail.ton')).toBe(false);
  });
});

describe('getTmailAliasBase', () => {
  it('extracts the same base regardless of the tmail.ton/tmail.ae suffix', () => {
    expect(getTmailAliasBase('alice@tmail.ton')).toBe('alice');
    expect(getTmailAliasBase('alice@tmail.ae')).toBe('alice');
  });
});

describe('parseTmailShareQr', () => {
  it('extracts a web2 mailbox', () => {
    expect(parseTmailShareQr('https://tmail-web.testprojects.org/share/john%40tmail.ai')).toBe('john@tmail.ai');
  });

  it('extracts a web3 mailbox with an encoded `#`', () => {
    expect(parseTmailShareQr('https://tmail-web.testprojects.org/share/0%23eqdabc%40tmail.ton'))
      .toBe('0#eqdabc@tmail.ton');
  });

  it('ignores the host, the query and the fragment', () => {
    expect(parseTmailShareQr('http://localhost:3000/share/john%40tmail.ton?ref=1#anchor')).toBe('john@tmail.ton');
  });

  it('returns undefined for non-share QRs', () => {
    expect(parseTmailShareQr('UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ')).toBeUndefined();
    expect(parseTmailShareQr('https://example.com/share/no-mailbox-here')).toBeUndefined();
    expect(parseTmailShareQr('https://example.com/share/%E0%A4%A')).toBeUndefined(); // Broken encoding
  });
});
