export enum StorageType {
  IndexedDb,
  LocalStorage,
  ExtensionLocal,
  AirStorage,
  NodeFile,
}

export interface NodeFileStorageConfig {
  type: 'nodeFile';
  path?: string;
  profile?: string;
}

export type ApiStorageConfig = NodeFileStorageConfig;

export interface Storage {
  getItem(name: StorageKey, force?: boolean): Promise<any>;

  setItem(name: StorageKey, value: any): Promise<void>;

  mutateItem?(name: StorageKey, mutate: (currentValue: any) => any): Promise<any>;

  removeItem(name: StorageKey): Promise<void>;

  clear(): Promise<void>;

  getAll?(): Promise<AnyLiteral>;

  setMany?(items: AnyLiteral): Promise<void>;

  getMany?(keys: string[]): Promise<AnyLiteral>;
}

export type StorageKey = 'accounts'
  | 'stateVersion'
  | 'currentAccountId'
  | 'clientId'
  | 'referrer'
  | 'langCode'
  | 'rpcOverrides'
  | 'hiddenChainsByNetwork'
  | 'accountHiddenChainsByNetwork'
  | 'vaultAccountIds'
  | 'hiddenChainsSeededV1'
  // Names (tmail alias / DNS domain) the user sent to, kept so the history doesn't fall back to reverse DNS
  | 'sentAddressNames'
  // Same purpose as `sentAddressNames`, but keyed by transaction hash instead of address - used where an
  // address-keyed cache doesn't fit (NFT transfers, domain linking; see `sentActivityNames.ts`)
  | 'sentActivityNames'
  // For extension
  | 'dapps'
  | 'dappMethods:lastAccountId'
  | 'windowId'
  | 'windowState'
  | 'isTonProxyEnabled'
  | 'isDeeplinkHookEnabled'
  // For TonConnect SSE
  | 'sseLastEventId'
  // For Headless
  | 'headlessBalanceSnapshots'
  // Local portfolio net-worth diary (per accountId)
  | 'portfolioSnapshots';
