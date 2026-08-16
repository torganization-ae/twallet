import type { ApiNft } from '../../types';

import { logDebugError } from '../../../util/logs';
import { parseTonapiioNft } from './util/metadata';
import { fetchAccountDnsExpiring } from './util/tonapiio';
import { fetchStoredWallet } from '../../common/accounts';
import { getNftSuperCollectionsByCollectionAddress } from '../../common/addresses';
import { resolveAddressByDomain } from './address';
import { fetchDomains } from './domains';

jest.mock('../../../util/account', () => ({
  parseAccountId: jest.fn(() => ({ network: 'mainnet' })),
}));

jest.mock('../../../util/logs', () => ({
  logDebugError: jest.fn(),
}));

jest.mock('./address', () => ({
  resolveAddressByDomain: jest.fn(),
}));

jest.mock('./transfer', () => ({
  checkMultiTransactionDraft: jest.fn(),
  submitMultiTransferWithMfa: jest.fn(),
}));

jest.mock('./util/metadata', () => ({
  parseTonapiioNft: jest.fn(),
}));

jest.mock('./util/tonapiio', () => ({
  fetchAccountDnsExpiring: jest.fn(),
}));

jest.mock('../../common/accounts', () => ({
  fetchStoredChainAccount: jest.fn(),
  fetchStoredWallet: jest.fn(),
}));

jest.mock('../../common/addresses', () => ({
  getNftSuperCollectionsByCollectionAddress: jest.fn(),
}));

const ACCOUNT_ID = 'mainnet-0';
const WALLET_ADDRESS = 'EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz';
const NFT_ADDRESS = 'EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi';
const LINKED_ADDRESS = 'EQBWG4EBbPDv4Xj7xlPwzxd7hSyHMzwwLB5O6rY-0BBeaixS';
const DOMAIN = 'alice.ton';
const EXPIRING_AT = 1798761600; // Unix seconds, as returned by TonAPI

const mockedFetchAccountDnsExpiring = jest.mocked(fetchAccountDnsExpiring);
const mockedFetchStoredWallet = jest.mocked(fetchStoredWallet);
const mockedGetNftSuperCollectionsByCollectionAddress = jest.mocked(getNftSuperCollectionsByCollectionAddress);
const mockedResolveAddressByDomain = jest.mocked(resolveAddressByDomain);
const mockedParseTonapiioNft = jest.mocked(parseTonapiioNft);
const mockedLogDebugError = jest.mocked(logDebugError);

describe('fetchDomains', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedFetchStoredWallet.mockResolvedValue(
      { address: WALLET_ADDRESS } as Awaited<ReturnType<typeof fetchStoredWallet>>,
    );
    mockedGetNftSuperCollectionsByCollectionAddress.mockResolvedValue({});
    mockedParseTonapiioNft.mockImplementation(() => makeNft());
    mockedResolveAddressByDomain.mockResolvedValue(LINKED_ADDRESS);
  });

  it('resolves and keeps the on-chain linked address for an owned domain', async () => {
    mockedFetchAccountDnsExpiring.mockResolvedValue(makeDnsExpiringItems());

    const result = await fetchDomains(ACCOUNT_ID);

    expect(mockedFetchAccountDnsExpiring).toHaveBeenCalledWith('mainnet', WALLET_ADDRESS, expect.any(Number));
    expect(mockedResolveAddressByDomain).toHaveBeenCalledWith('mainnet', DOMAIN);
    expect(result.expirationByAddress).toEqual({
      [NFT_ADDRESS]: EXPIRING_AT * 1000,
    });
    expect(result.linkedAddressByAddress).toEqual({
      [NFT_ADDRESS]: LINKED_ADDRESS,
    });
    expect(result.nfts).toEqual({
      [NFT_ADDRESS]: expect.objectContaining({ address: NFT_ADDRESS }),
    });
  });

  it('omits the linked address but keeps the domain NFT when the domain has no on-chain wallet record', async () => {
    mockedFetchAccountDnsExpiring.mockResolvedValue(makeDnsExpiringItems());
    mockedResolveAddressByDomain.mockResolvedValue(undefined);

    const result = await fetchDomains(ACCOUNT_ID);

    expect(result.linkedAddressByAddress).toEqual({});
    expect(result.nfts).toEqual({
      [NFT_ADDRESS]: expect.objectContaining({ address: NFT_ADDRESS }),
    });
    expect(mockedLogDebugError).not.toHaveBeenCalled();
  });

  it('omits the linked address but keeps the domain NFT when on-chain resolving fails', async () => {
    const error = new Error('Resolver unavailable');
    mockedFetchAccountDnsExpiring.mockResolvedValue(makeDnsExpiringItems());
    mockedResolveAddressByDomain.mockRejectedValue(error);

    const result = await fetchDomains(ACCOUNT_ID);

    expect(result.linkedAddressByAddress).toEqual({});
    expect(result.nfts).toEqual({
      [NFT_ADDRESS]: expect.objectContaining({ address: NFT_ADDRESS }),
    });
    expect(mockedLogDebugError).toHaveBeenCalledWith('resolveDnsLinkedAddress', { domain: DOMAIN }, error);
  });

  it('skips an item without a raw NFT, without resolving its linked address', async () => {
    mockedFetchAccountDnsExpiring.mockResolvedValue(makeDnsExpiringItems({ hasDnsItem: false }));

    const result = await fetchDomains(ACCOUNT_ID);

    expect(mockedParseTonapiioNft).not.toHaveBeenCalled();
    expect(mockedResolveAddressByDomain).not.toHaveBeenCalled();
    expect(result.expirationByAddress).toEqual({});
    expect(result.nfts).toEqual({});
  });

  it('skips an item the NFT parser rejects, without resolving its linked address', async () => {
    mockedFetchAccountDnsExpiring.mockResolvedValue(makeDnsExpiringItems());
    mockedParseTonapiioNft.mockReturnValue(undefined);

    const result = await fetchDomains(ACCOUNT_ID);

    expect(mockedResolveAddressByDomain).not.toHaveBeenCalled();
    expect(result.expirationByAddress).toEqual({});
    expect(result.nfts).toEqual({});
  });
});

function makeDnsExpiringItems(options: { hasDnsItem?: boolean } = {}) {
  const { hasDnsItem = true } = options;

  return [{
    name: DOMAIN,
    expiring_at: EXPIRING_AT,
    dns_item: hasDnsItem ? { address: NFT_ADDRESS } : undefined,
  }] as unknown as Awaited<ReturnType<typeof fetchAccountDnsExpiring>>;
}

function makeNft(): ApiNft {
  return {
    chain: 'ton',
    index: 1,
    address: NFT_ADDRESS,
    thumbnail: '',
    image: '',
    name: DOMAIN,
    collectionAddress: WALLET_ADDRESS,
    isOnSale: false,
    metadata: {},
    interface: 'default',
  };
}
