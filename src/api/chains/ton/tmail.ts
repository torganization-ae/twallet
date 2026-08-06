import { Address, beginCell } from '@ton/core';

import type { ApiNetwork } from '../../types';

import { TMAIL_DNS_COLLECTION_ADDRESS } from '../../../config';
import { getTmailAliasBase } from '../../../util/tmail';
import { getTonClient, toBase64Address } from './util/tonCore';

export async function resolveTmailAlias(network: ApiNetwork, alias: string): Promise<string | undefined> {
  if (network !== 'mainnet') {
    return undefined;
  }

  const base = getTmailAliasBase(alias);
  if (!base) {
    return undefined;
  }

  try {
    const client = getTonClient(network);
    const domainCell = beginCell().storeBuffer(Buffer.from(base, 'utf8')).asCell();

    const { stack: itemStack } = await client.callGetMethod(
      Address.parse(TMAIL_DNS_COLLECTION_ADDRESS),
      'get_nft_address_by_domain',
      [{ type: 'slice', cell: domainCell }],
    );

    const itemAddress = itemStack.readAddress();

    const { stack: dataStack } = await client.callGetMethod(itemAddress, 'get_nft_data', []);
    // (int init?, int index, slice collection_address, slice owner_address, cell content, cell domain)
    const initFlag = dataStack.readNumber();
    dataStack.readBigNumber(); // index
    dataStack.readAddress(); // collection_address
    const owner = dataStack.readAddressOpt();

    // init? === -1 means the NFT item is initialized with an owner.
    if (initFlag !== -1 || !owner) {
      return undefined;
    }

    return toBase64Address(owner, undefined, network);
  } catch (err: any) {
    if (!err.message?.includes('exit_code')) {
      throw err;
    }
    return undefined;
  }
}
