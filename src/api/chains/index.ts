import type { ApiChain } from '../types';
import type { ChainSdk } from '../types/chains';

/**
 * This dictionary contains only universal chain methods, i.e. the methods having the same interface in all the chains.
 *
 * If you need chain-specific methods, import them directly from the corresponding chain module. This is deprecated —
 * all chain methods should be universal. If a chain doesn't support some functionality yet, the corresponding methods
 * should simply throw an error.
 *
 * Built-in chains are registered behind `process.env.NO_*` build flags.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const chainInstances = {} as { [K in ApiChain]: ChainSdk<K> };

if (process.env.NO_TON !== '1') {
  chainInstances.ton = require('./ton').default;
}

if (process.env.NO_TRON !== '1') {
  chainInstances.tron = require('./tron').default;
}

if (process.env.NO_SOLANA !== '1') {
  chainInstances.solana = require('./solana').default;
}

if (process.env.NO_EVM !== '1') {
  const EVMSdk = require('./evm').default;
  Object.assign(chainInstances, {
    ethereum: new EVMSdk('ethereum'),
    base: new EVMSdk('base'),
    bnb: new EVMSdk('bnb'),
    polygon: new EVMSdk('polygon'),
    arbitrum: new EVMSdk('arbitrum'),
    monad: new EVMSdk('monad'),
    avalanche: new EVMSdk('avalanche'),
    hyperliquid: new EVMSdk('hyperliquid'),
  });
}

export const chains = chainInstances;
/* eslint-enable @typescript-eslint/no-require-imports */

export default chains;
