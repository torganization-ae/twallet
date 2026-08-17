import { getActivityName, loadSentActivityNames, rememberActivityName } from './sentActivityNames';

const storageState: Record<string, unknown> = {};

jest.mock('../storages', () => ({
  storage: {
    getItem: jest.fn((key: string) => Promise.resolve(storageState[key])),
    setItem: jest.fn((key: string, value: unknown) => {
      storageState[key] = value;
      return Promise.resolve();
    }),
  },
}));

describe('sentActivityNames', () => {
  it('returns undefined for a hash that was never remembered', () => {
    expect(getActivityName('never-remembered-hash')).toBeUndefined();
  });

  it('returns undefined for an undefined hash', () => {
    expect(getActivityName(undefined)).toBeUndefined();
  });

  it('remembers a name and returns it by hash', () => {
    rememberActivityName('hash-1', 'w2@tmail.ton');
    expect(getActivityName('hash-1')).toBe('w2@tmail.ton');
  });

  it('trims the remembered name', () => {
    rememberActivityName('hash-2', '  w3@tmail.ton  ');
    expect(getActivityName('hash-2')).toBe('w3@tmail.ton');
  });

  it('is a no-op for an empty/blank name', () => {
    rememberActivityName('hash-3', '   ');
    expect(getActivityName('hash-3')).toBeUndefined();
  });

  it('is a no-op when given no hash', () => {
    rememberActivityName(undefined, 'w4@tmail.ton');
    expect(getActivityName(undefined)).toBeUndefined();
  });

  it('persists via storage.setItem', async () => {
    rememberActivityName('hash-persist', 'w5@tmail.ton');
    // The write is chained/async - flush microtasks before asserting.
    await Promise.resolve();
    await Promise.resolve();

    const { storage } = jest.requireMock('../storages');
    expect(storage.setItem).toHaveBeenCalledWith('sentActivityNames', expect.objectContaining({
      'hash-persist': 'w5@tmail.ton',
    }));
  });

  it('loadSentActivityNames restores the persisted map', async () => {
    storageState.sentActivityNames = { 'restored-hash': 'restored-name' };

    await loadSentActivityNames();

    expect(getActivityName('restored-hash')).toBe('restored-name');
  });

  it('evicts the oldest entries beyond the cap', () => {
    storageState.sentActivityNames = undefined;

    for (let i = 0; i < 205; i++) {
      rememberActivityName(`cap-hash-${i}`, `name-${i}`);
    }

    // The first 5 inserted should have been evicted; the most recent 200 remain.
    expect(getActivityName('cap-hash-0')).toBeUndefined();
    expect(getActivityName('cap-hash-4')).toBeUndefined();
    expect(getActivityName('cap-hash-5')).toBe('name-5');
    expect(getActivityName('cap-hash-204')).toBe('name-204');
  });
});
