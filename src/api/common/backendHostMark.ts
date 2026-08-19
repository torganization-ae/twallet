import { API_HOST_MARK, getApiHostMark } from '../../config';

let observedMark: string | undefined;

/** Remember the hostname of a URL sent to or received from our backend. */
export function rememberBackendUrl(url: string | URL) {
  const mark = getApiHostMark(String(url));
  if (mark) {
    observedMark = mark;
  }
}

/** First letter of the last observed backend host, else the build-time `API_BASE_URL`. */
export function getBackendHostMark() {
  return observedMark ?? API_HOST_MARK;
}

export function resetBackendHostMarkForTests() {
  observedMark = undefined;
}
