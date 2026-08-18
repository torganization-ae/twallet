import type { OnApiUpdate } from '../types';

/** Internal diagnostic codes for our backend (`API_BASE_URL`) fetch failures. */
export const BACKEND_NETWORK_ERROR_ASSETS = 567;
export const BACKEND_NETWORK_ERROR_PROXY = 345;

const REPORT_COOLDOWN_MS = 45_000;
const lastReportedAtByCode: Record<number, number> = {};

let updater: OnApiUpdate | undefined;

export function setBackendNetworkErrorUpdater(onUpdate?: OnApiUpdate) {
  updater = onUpdate;
}

export function formatBackendNetworkError(code: number): string {
  return `Problem connect network ${code}`;
}

/** Surface a red bulletin when our backend cannot be reached or answered. */
export function reportBackendNetworkError(code: number) {
  const now = Date.now();
  const lastReportedAt = lastReportedAtByCode[code];
  if (lastReportedAt !== undefined && lastReportedAt + REPORT_COOLDOWN_MS > now) {
    return;
  }
  lastReportedAtByCode[code] = now;
  updater?.({
    type: 'backendNetworkError',
    code,
  });
}

export function resetBackendNetworkErrorReportsForTests() {
  for (const key of Object.keys(lastReportedAtByCode)) {
    delete lastReportedAtByCode[Number(key)];
  }
}
