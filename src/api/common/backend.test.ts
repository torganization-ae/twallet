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
});
