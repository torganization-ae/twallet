import { NO_BACKEND } from '../../config';
import { getNftSuperCollectionsByCollectionAddress } from './addresses';

describe('getNftSuperCollectionsByCollectionAddress', () => {
  it('resolves without the backend', async () => {
    expect(NO_BACKEND).toBe(true); // Otherwise `tryUpdateKnownAddresses` resolves the deferred

    // Only `tryUpdateKnownAddresses` resolves the deferred, and `NO_BACKEND` skips it, so this
    // used to hang forever — taking the NFT list and the activity feed with it.
    const result = await Promise.race([
      getNftSuperCollectionsByCollectionAddress(),
      new Promise((_, reject) => { setTimeout(() => reject(new Error('hangs')), 1000); }),
    ]);

    expect(result).toEqual({});
  });
});
