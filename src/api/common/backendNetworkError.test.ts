import {
  BACKEND_NETWORK_ERROR_ASSETS,
  BACKEND_NETWORK_ERROR_PROXY,
  formatBackendNetworkError,
  reportBackendNetworkError,
  resetBackendNetworkErrorReportsForTests,
  setBackendNetworkErrorUpdater,
} from './backendNetworkError';

describe('backendNetworkError', () => {
  const onUpdate = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    onUpdate.mockReset();
    resetBackendNetworkErrorReportsForTests();
    setBackendNetworkErrorUpdater(onUpdate);
  });

  afterEach(() => {
    setBackendNetworkErrorUpdater(undefined);
    jest.useRealTimers();
  });

  it('formats the bulletin with the internal code', () => {
    expect(formatBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS)).toBe('Problem connect network 567');
    expect(formatBackendNetworkError(BACKEND_NETWORK_ERROR_PROXY)).toBe('Problem connect network 345');
  });

  it('emits a backendNetworkError update', () => {
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS);

    expect(onUpdate).toHaveBeenCalledWith({
      type: 'backendNetworkError',
      code: 567,
    });
  });

  it('does not spam the same code within the cooldown', () => {
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS);
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS);

    expect(onUpdate).toHaveBeenCalledTimes(1);

    jest.setSystemTime(45_000);
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS);

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('tracks assets and proxy codes independently', () => {
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS);
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_PROXY);

    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenNthCalledWith(2, {
      type: 'backendNetworkError',
      code: 345,
    });
  });
});
