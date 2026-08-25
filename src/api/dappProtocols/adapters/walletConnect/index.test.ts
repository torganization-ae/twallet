import { WalletKit } from '@reown/walletkit';

import { createWalletConnectAdapter } from '.';

jest.mock('@reown/walletkit', () => ({
  WalletKit: { init: jest.fn() },
  isPaymentLink: jest.fn(),
}));

jest.mock('@walletconnect/core', () => ({
  Core: jest.fn(),
}));

jest.mock('@walletconnect/utils', () => ({
  buildApprovedNamespaces: jest.fn(),
  buildAuthObject: jest.fn(),
  getSdkError: jest.fn(),
  populateAuthPayload: jest.fn(),
}));

jest.mock('../../../../config', () => ({
  ...jest.requireActual('../../../../config'),
  WALLET_CONNECT_PROJECT_ID: 'test-project-id',
}));

jest.mock('../../../../util/focusAwareDelay', () => ({
  onAppFocus: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../util/logs', () => ({
  logDebug: jest.fn(),
  logDebugError: jest.fn(),
}));

describe('WalletConnectAdapter initialization', () => {
  const indexedDbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  let randomSpy: jest.SpiedFunction<typeof Math.random>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(WalletKit.init).mockReset();
    jest.mocked(WalletKit.init).mockImplementation(() => new Promise(() => undefined));
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: {} });
  });

  afterEach(() => {
    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  afterAll(() => {
    if (indexedDbDescriptor) {
      Object.defineProperty(globalThis, 'indexedDB', indexedDbDescriptor);
    } else {
      delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    }
  });

  it('retries after timeout when the previous WalletKit init never settles', async () => {
    const adapter = createWalletConnectAdapter();
    const config = {
      onUpdate: jest.fn(),
      chainDappSupports: {},
    } as unknown as Parameters<typeof adapter.init>[0];

    await adapter.init(config);
    expect(WalletKit.init).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(8000);
    await jest.advanceTimersByTimeAsync(500);

    expect(WalletKit.init).toHaveBeenCalledTimes(2);
    await adapter.destroy();
  });
});
