import type { ApiNft } from '../types';

import { submitNftTransfers } from './nfts';

jest.mock('../chains', () => ({
  __esModule: true,
  default: {
    ton: {
      submitNftTransfers: jest.fn(),
    },
  },
}));

jest.mock('../common/accounts', () => ({
  fetchStoredWallet: jest.fn(() => Promise.resolve({ address: 'my-wallet-address' })),
  getCurrentAccountId: jest.fn(),
}));

jest.mock('../common/sentActivityNames', () => ({
  rememberActivityName: jest.fn(),
}));

jest.mock('./transfer', () => ({
  createLocalTransactions: jest.fn(() => [{ id: 'local-id' }]),
}));

jest.mock('./mfa', () => ({
  publishSignedMfaRequest: jest.fn(),
  refreshMfaState: jest.fn(() => Promise.resolve(undefined)),
  registerMfaConfirmationHandler: jest.fn(),
}));

jest.mock('../common/polling/collectiblesPolling', () => ({
  setCollectiblesPollingActive: jest.fn(),
}));

const chains = jest.requireMock('../chains').default;
const { rememberActivityName } = jest.requireMock('../common/sentActivityNames');
const { registerMfaConfirmationHandler, publishSignedMfaRequest } = jest.requireMock('./mfa');

const nft: ApiNft = {
  chain: 'ton',
  interface: 'default',
  index: 1,
  name: 'Test NFT',
  address: 'nft-address',
  thumbnail: 'https://example.com/thumb.jpg',
  image: 'https://example.com/image.jpg',
  isOnSale: false,
  metadata: {},
};

describe('submitNftTransfers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chains.ton.submitNftTransfers.mockResolvedValue({
      transfers: [{ toAddress: 'recipient-address' }],
      msgHashNormalized: 'the-tx-hash',
    });
  });

  it('remembers the resolved name by tx hash when addressName is given', async () => {
    await submitNftTransfers(
      'ton', 'account-1', 'password', [nft], 'recipient-address', undefined, 0n, false, 'w2@tmail.ton',
    );

    expect(rememberActivityName).toHaveBeenCalledWith('the-tx-hash', 'w2@tmail.ton');
  });

  it('does not remember anything when addressName is absent', async () => {
    await submitNftTransfers('ton', 'account-1', 'password', [nft], 'recipient-address');

    expect(rememberActivityName).not.toHaveBeenCalled();
  });

  it('remembers the resolved name by tx hash in the MFA branch too', async () => {
    chains.ton.submitNftTransfers.mockResolvedValue({ mfaRequest: {} });
    publishSignedMfaRequest.mockResolvedValue({ mfaRequestHash: 'mfa-hash' });

    await submitNftTransfers(
      'ton', 'account-1', 'password', [nft], 'recipient-address', undefined, 0n, false, 'w2@tmail.ton',
    );

    expect(registerMfaConfirmationHandler).toHaveBeenCalledWith('mfa-hash', expect.any(Function));
    const mfaCallback = registerMfaConfirmationHandler.mock.calls[0][1];

    mfaCallback('mfa-confirmed-tx-hash');

    expect(rememberActivityName).toHaveBeenCalledWith('mfa-confirmed-tx-hash', 'w2@tmail.ton');
  });
});
