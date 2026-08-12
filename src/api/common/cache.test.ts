import { NO_BACKEND } from '../../config';
import { getBackendConfigCache } from './cache';

describe('getBackendConfigCache', () => {
  it('resolves without the backend', async () => {
    expect(NO_BACKEND).toBe(true); // Otherwise `tryUpdateConfig` fills the cache

    // Only `tryUpdateConfig` fills the cache, and `NO_BACKEND` skips it, so this used to hang
    // forever — blocking `swapReplaceActivities` and with it the whole activity feed.
    const config = await Promise.race([
      getBackendConfigCache(),
      new Promise((_, reject) => { setTimeout(() => reject(new Error('hangs')), 1000); }),
    ]);

    expect(config).toBeDefined();
  });
});
