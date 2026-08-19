import { formatDisplayedAppVersion, getApiHostMark } from './config';

describe('getApiHostMark', () => {
  it('takes the first letter of the API hostname', () => {
    expect(getApiHostMark('https://alpha.example.test')).toBe('a');
    expect(getApiHostMark('https://north.example.org/')).toBe('n');
    expect(getApiHostMark('https://API.Example.COM/v1')).toBe('a');
  });

  it('returns undefined for an unparseable URL', () => {
    expect(getApiHostMark('')).toBeUndefined();
    expect(getApiHostMark('not-a-url')).toBeUndefined();
  });
});

describe('formatDisplayedAppVersion', () => {
  it('appends host mark then env marker', () => {
    expect(formatDisplayedAppVersion('26.7.19', 'Dev', 's')).toBe('26.7.19 s Dev');
    expect(formatDisplayedAppVersion('26.7.19', undefined, 'n')).toBe('26.7.19 n');
    expect(formatDisplayedAppVersion('26.7.19', 'Beta', '')).toBe('26.7.19 Beta');
  });
});
