import { TRC20_USDT_MAINNET, TRC20_USDT_TESTNET } from '../../../config';
import { getEffectiveRpcUrl } from '../rpcOverrides';

export const TRON_BIP39_PATH = `m/44'/195'/0'/0/{index}`;

export const TRON_GAS = {
  transferTrc20Estimated: 28_214_970n,
};

export const ONE_TRX = 1_000_000n;

export const NETWORK_CONFIG = {
  get mainnet() {
    return {
      apiUrl: getEffectiveRpcUrl('tron', 'mainnet'),
      usdtAddress: TRC20_USDT_MAINNET.tokenAddress,
    };
  },
  get testnet() {
    return {
      apiUrl: getEffectiveRpcUrl('tron', 'testnet'),
      usdtAddress: TRC20_USDT_TESTNET.tokenAddress,
    };
  },
};
