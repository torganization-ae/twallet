import type { ApiNetwork, ApiNft } from '../../types';
import type { TonTransferParams } from './types';

import { parseAccountId } from '../../../util/account';
import { split } from '../../../util/iteratees';
import { logDebugError } from '../../../util/logs';
import { createTaskQueue } from '../../../util/schedulers';
import { getMaxMessagesInTransaction } from '../../../util/ton/transfer';
import { parseTonapiioNft } from './util/metadata';
import { fetchAccountDnsExpiring } from './util/tonapiio';
import { DnsItem } from './contracts/DnsItem';
import { fetchStoredChainAccount, fetchStoredWallet } from '../../common/accounts';
import { getNftSuperCollectionsByCollectionAddress } from '../../common/addresses';
import { resolveAddressByDomain } from './address';
import { TON_GAS } from './constants';
import { checkMultiTransactionDraft, submitMultiTransferWithMfa } from './transfer';

const LINKED_ADDRESS_VERIFICATION_CONCURRENCY = 3;
const linkedAddressVerificationQueue = createTaskQueue(LINKED_ADDRESS_VERIFICATION_CONCURRENCY);

/** 366 days safely covers a TON DNS domain's 1-year renewal window (TonAPI accepts up to 3660). */
const DNS_EXPIRING_PERIOD_DAYS = 366;

export async function checkDnsRenewalDraft(accountId: string, nftAddresses: string[]) {
  const account = await fetchStoredChainAccount(accountId, 'ton');
  const maxMessages = getMaxMessagesInTransaction(account);
  const transactionCount = Math.ceil(nftAddresses.length / maxMessages);

  const messages = nftAddresses
    .slice(0, maxMessages)
    .map(makeRenewMessage);

  const result = await checkMultiTransactionDraft(accountId, messages);

  if ('error' in result) {
    return result;
  }

  const totalAmount = TON_GAS.changeDns * BigInt(nftAddresses.length);
  const realFee = totalAmount + result.emulation.networkFee * BigInt(transactionCount); // Not very correct, but ≥ the actual fee

  return { realFee };
}

export async function* submitDnsRenewal(accountId: string, password: string | undefined, nftAddresses: string[]) {
  const account = await fetchStoredChainAccount(accountId, 'ton');
  const maxMessages = getMaxMessagesInTransaction(account);
  const nftBatches = split(nftAddresses, maxMessages);

  for (const nftBatch of nftBatches) {
    const messages: TonTransferParams[] = nftBatch.map(makeRenewMessage);

    yield {
      addresses: nftBatch,
      result: await submitMultiTransferWithMfa({ accountId, password, messages }),
    };
  }
}

export async function checkDnsChangeWalletDraft(accountId: string, nftAddress: string, address: string) {
  const result = await checkMultiTransactionDraft(accountId, [makeChangeMessage(nftAddress, address)]);

  if ('error' in result) {
    return result;
  }

  return { realFee: result.emulation.networkFee + TON_GAS.changeDns };
}

export function submitDnsChangeWallet(
  accountId: string,
  password: string | undefined,
  nftAddress: string,
  address: string,
) {
  return submitMultiTransferWithMfa({
    accountId,
    password,
    messages: [makeChangeMessage(nftAddress, address)],
  });
}

function makeRenewMessage(nftAddress: string) {
  return {
    toAddress: nftAddress,
    payload: DnsItem.buildFillUpMessage(),
    amount: TON_GAS.changeDns,
  };
}

function makeChangeMessage(nftAddress: string, linkedAddress: string) {
  return {
    toAddress: nftAddress,
    payload: DnsItem.buildChangeDnsWalletMessage(linkedAddress),
    amount: TON_GAS.changeDns,
  };
}

export async function fetchDomains(accountId: string) {
  const { network } = parseAccountId(accountId);
  const { address } = await fetchStoredWallet(accountId, 'ton');
  const items = await fetchAccountDnsExpiring(network, address, DNS_EXPIRING_PERIOD_DAYS);
  const nftSuperCollectionsByCollectionAddress = await getNftSuperCollectionsByCollectionAddress();

  const expirationByAddress: Record<string, number> = {};
  const linkedAddressByAddress: Record<string, string> = {};
  const nfts: Record<string, ApiNft> = {};

  await Promise.all(items.map(async ({ name, expiring_at, dns_item }) => {
    if (!dns_item) return;

    const nft = parseTonapiioNft(network, dns_item, nftSuperCollectionsByCollectionAddress);
    if (!nft) return;

    expirationByAddress[nft.address] = expiring_at * 1000;
    nfts[nft.address] = nft;

    const linkedAddress = await linkedAddressVerificationQueue.run(
      () => resolveDnsLinkedAddress(network, name),
    );
    if (linkedAddress) {
      linkedAddressByAddress[nft.address] = linkedAddress;
    }
  }));

  return {
    expirationByAddress,
    linkedAddressByAddress,
    nfts,
  };
}

async function resolveDnsLinkedAddress(network: ApiNetwork, domain: string) {
  try {
    return await resolveAddressByDomain(network, domain);
  } catch (err) {
    logDebugError('resolveDnsLinkedAddress', { domain }, err);
    return undefined;
  }
}
