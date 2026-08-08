import {
  clearCollectiblesPolling,
  registerCollectiblesPolling,
  setCollectiblesPollingActive,
} from './collectiblesPolling';

describe('collectiblesPolling', () => {
  afterEach(() => {
    clearCollectiblesPolling();
  });

  it('does not start registered factories until the collectibles tab is active', () => {
    const stop = jest.fn();
    const factory = jest.fn(() => stop);

    registerCollectiblesPolling('0-mainnet', factory);
    expect(factory).not.toHaveBeenCalled();

    setCollectiblesPollingActive('0-mainnet', true);
    expect(factory).toHaveBeenCalledTimes(1);

    setCollectiblesPollingActive('0-mainnet', false);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('starts multiple chain factories for one account', () => {
    const stopTon = jest.fn();
    const stopEth = jest.fn();
    const tonFactory = jest.fn(() => stopTon);
    const ethFactory = jest.fn(() => stopEth);

    setCollectiblesPollingActive('0-mainnet', true);
    registerCollectiblesPolling('0-mainnet', tonFactory, 'ton');
    registerCollectiblesPolling('0-mainnet', ethFactory, 'ethereum');

    expect(tonFactory).toHaveBeenCalledTimes(1);
    expect(ethFactory).toHaveBeenCalledTimes(1);

    setCollectiblesPollingActive('0-mainnet', false);
    expect(stopTon).toHaveBeenCalledTimes(1);
    expect(stopEth).toHaveBeenCalledTimes(1);
  });

  it('does not start factories for a different account', () => {
    const factory = jest.fn(() => jest.fn());
    registerCollectiblesPolling('1-mainnet', factory);
    setCollectiblesPollingActive('0-mainnet', true);
    expect(factory).not.toHaveBeenCalled();
  });
});
