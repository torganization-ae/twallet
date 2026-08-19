const mockFetchJson = jest.fn();

jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  API_BASE_URL: 'https://api.example.test',
  NO_BACKEND: false,
}));

jest.mock('../../util/fetch', () => ({
  fetchJson: (...args: unknown[]) => mockFetchJson(...args),
}));

jest.mock('../environment', () => ({
  getEnvironment: () => ({
    apiHeaders: {},
  }),
}));

jest.mock('./other', () => ({
  getClientId: () => 'test-client-id',
}));

describe('backend API helpers', () => {
  beforeEach(() => {
    mockFetchJson.mockResolvedValue({});
  });

  afterEach(() => {
    mockFetchJson.mockReset();
  });

  it('uses per-endpoint circuit breaker buckets for backend GET requests', async () => {
    const { callBackendGet } = await import('./backend');

    await callBackendGet('/swap/assets');

    expect(mockFetchJson).toHaveBeenCalledWith(
      expect.any(URL),
      undefined,
      expect.any(Object),
      { bucketKey: 'https://api.example.test/swap' },
    );
  });

  it('sends nothing while the backend is cut off', async () => {
    jest.resetModules();
    jest.doMock('../../config', () => ({
      ...jest.requireActual('../../config'),
      NO_BACKEND: true,
    }));

    const { callBackendGet, callBackendPost } = await import('./backend');

    await expect(callBackendGet('/swap/assets')).rejects.toThrow('Backend is disabled');
    await expect(callBackendPost('/swap/estimate', {})).rejects.toThrow('Backend is disabled');
    expect(mockFetchJson).not.toHaveBeenCalled();
  });

  it('keeps the implemented paths alive while the rest is cut off', async () => {
    jest.resetModules();
    jest.doMock('../../config', () => ({
      ...jest.requireActual('../../config'),
      API_BASE_URL: 'https://api.example.test',
      NO_BACKEND: true,
    }));

    const { callBackendGet } = await import('./backend');

    await callBackendGet('/currency-rates');
    expect(mockFetchJson.mock.calls[0][0].toString()).toBe('https://api.example.test/currency-rates');

    await callBackendGet('/prices/chart/ton:TON', { period: '7D' });
    expect(mockFetchJson.mock.calls[1][0].toString()).toBe('https://api.example.test/prices/chart/ton:TON');

    await expect(callBackendGet('/swap/assets')).rejects.toThrow('Backend is disabled');
  });

  it('reports 567 when GET /assets fails to reach our backend', async () => {
    jest.resetModules();
    jest.doMock('../../config', () => ({
      ...jest.requireActual('../../config'),
      API_BASE_URL: 'https://api.example.test',
      NO_BACKEND: false,
    }));

    const onUpdate = jest.fn();
    const {
      resetBackendNetworkErrorReportsForTests,
      setBackendNetworkErrorUpdater,
    } = await import('./backendNetworkError');
    resetBackendNetworkErrorReportsForTests();
    setBackendNetworkErrorUpdater(onUpdate);

    mockFetchJson.mockRejectedValueOnce(new Error('network down'));
    const { callBackendGet } = await import('./backend');

    await expect(callBackendGet('/assets')).rejects.toThrow('network down');
    expect(onUpdate).toHaveBeenCalledWith({ type: 'backendNetworkError', code: 567 });

    onUpdate.mockClear();
    mockFetchJson.mockRejectedValueOnce(new Error('network down'));
    await expect(callBackendGet('/currency-rates')).rejects.toThrow('network down');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('records the host letter from the URL that is actually fetched', async () => {
    jest.resetModules();
    jest.doMock('../../config', () => ({
      ...jest.requireActual('../../config'),
      API_BASE_URL: 'https://north.example.org',
      NO_BACKEND: false,
    }));

    mockFetchJson.mockResolvedValueOnce({});
    const { callBackendGet } = await import('./backend');
    const { getBackendHostMark } = await import('./backendHostMark');

    await callBackendGet('/assets');
    expect(getBackendHostMark()).toBe('n');
  });
});
