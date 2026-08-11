import { parseTmailShareQr } from './tmail';

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
