import { API_HOST_MARK, getApiHostMark } from '../../config';
import {
  getBackendHostMark,
  rememberBackendUrl,
  resetBackendHostMarkForTests,
} from './backendHostMark';

describe('backendHostMark', () => {
  afterEach(() => {
    resetBackendHostMarkForTests();
  });

  it('falls back to the compile-time API host until a fetch is observed', () => {
    expect(getBackendHostMark()).toBe(API_HOST_MARK);
  });

  it('takes the first letter of the URL that was actually fetched', () => {
    rememberBackendUrl('https://north.example.org/assets');
    expect(getBackendHostMark()).toBe('n');

    rememberBackendUrl(new URL('https://south.example.test/currency-rates'));
    expect(getBackendHostMark()).toBe('s');
  });

  it('ignores unparseable URLs', () => {
    rememberBackendUrl('not-a-url');
    expect(getBackendHostMark()).toBe(API_HOST_MARK);
    expect(getApiHostMark('not-a-url')).toBeUndefined();
  });
});
