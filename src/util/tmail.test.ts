import {
  getTmailAliasBase,
  isTmailAlias,
} from './tmail';

const correctTmailAliases = [
  'alice@tmail.ton',
  'bob-123@tmail.ton',
  'a_b@tmail.ton',
  'x+y@tmail.ton',
  'ALICE@tmail.ton',
  '  alice@tmail.ton  ',
];

const incorrectTmailAliases = [
  // Missing suffix
  'alice@ton',
  'alice@gmail.com',
  // Empty base
  '@tmail.ton',
  // Invalid chars
  'al ice@tmail.ton',
  'al.ice@tmail.ton',
  // Hyphen/underscore/plus at start or end
  '-alice@tmail.ton',
  'alice-@tmail.ton',
  '_alice@tmail.ton',
  '+alice@tmail.ton',
  // Too long (65 chars)
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@tmail.ton',
];

describe('isTmailAlias', () => {
  it.each(correctTmailAliases)('returns true for %s', (alias) => {
    expect(isTmailAlias(alias)).toBe(true);
  });

  it.each(incorrectTmailAliases)('returns false for %s', (alias) => {
    expect(isTmailAlias(alias)).toBe(false);
  });
});

describe('getTmailAliasBase', () => {
  it('extracts the base from a valid alias', () => {
    expect(getTmailAliasBase('alice@tmail.ton')).toBe('alice');
    expect(getTmailAliasBase('  Bob-123@tmail.ton  ')).toBe('bob-123');
  });

  it('returns undefined for an invalid alias', () => {
    expect(getTmailAliasBase('@tmail.ton')).toBeUndefined();
    expect(getTmailAliasBase('-alice@tmail.ton')).toBeUndefined();
    expect(getTmailAliasBase('alice@ton')).toBeUndefined();
  });
});
