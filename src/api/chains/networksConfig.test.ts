describe('networksConfig endpoint resolution', () => {
  const OLD_ENV = process.env.API_BASE_URL;

  afterEach(() => {
    process.env.API_BASE_URL = OLD_ENV;
    jest.resetModules();
  });

  function load(apiBaseUrl: string) {
    process.env.API_BASE_URL = apiBaseUrl;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    return require('./networksConfig');
  }

  it('joins relative endpoints with API_BASE_URL (trailing slash ignored)', () => {
    const endpoint = load('https://nexus.example.test/').getSharedDefaultEndpoint('ton', 'mainnet');

    expect(endpoint.rpc).toBe('https://nexus.example.test/toncenter');
    expect(endpoint.api).toBe('https://nexus.example.test/tonapiio');
  });

  it('leaves third-party absolute endpoints untouched', () => {
    const endpoint = load('https://nexus.example.test').getSharedDefaultEndpoint('ton', 'testnet');

    expect(endpoint.rpc).toBe('https://testnet.toncenter.com');
  });

  it('exposes the resolved host to the CSP allow-list', () => {
    const hosts = load('https://nexus.example.test').getSharedDefaultEndpointHosts();

    expect(hosts).toContain('https://nexus.example.test');
  });
});
