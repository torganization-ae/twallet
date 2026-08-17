import type { ApiNft } from '../types';

import { submitDnsChangeWallet } from './domains';

jest.mock('../chains/ton', () => ({
  submitDnsChangeWallet: jest.fn(),
}));

jest.mock('../common/accounts', () => ({
  fetchStoredWallet: jest.fn(() => Promise.resolve({ address: 'my-wallet-address' })),
}));

jest.mock('../common/sentActivityNames', () => ({
  rememberActivityName: jest.fn(),
}));

jest.mock('./transfer', () => ({
  createLocalTransactions: jest.fn(() => [{ id: 'local-id' }]),
}));

jest.mock('./mfa', () => ({
  publishSignedMfaRequest: jest.fn(),
}));

const ton = jest.requireMock('../chains/ton');
const { rememberActivityName } = jest.requireMock('../common/sentActivityNames');

const nft: ApiNft = {
  chain: 'ton',
  interface: 'default',
  index: 1,
  name: 'Test Domain',
  address: 'domain-nft-address',
  thumbnail: 'https://example.com/thumb.jpg',
  image: 'https://example.com/image.jpg',
  isOnSale: false,
  metadata: {},
};

describe('submitDnsChangeWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ton.submitDnsChangeWallet.mockResolvedValue({ msgHashNormalized: 'the-tx-hash' });
  });

  it('remembers the resolved name by tx hash, keyed away from the domain NFT address', async () => {
    await submitDnsChangeWallet('account-1', 'password', nft, 'linked-wallet-address', 0n, 'w2@tmail.ton');

    expect(rememberActivityName).toHaveBeenCalledWith('the-tx-hash', 'w2@tmail.ton');
  });

  it('does not remember anything when addressName is absent', async () => {
    await submitDnsChangeWallet('account-1', 'password', nft, 'linked-wallet-address');

    expect(rememberActivityName).not.toHaveBeenCalled();
  });
});
