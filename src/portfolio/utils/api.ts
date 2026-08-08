// Standalone portfolio dapp has no remote history API; diary lives in the wallet app.

export class RetryExhaustedError extends Error {
  constructor() {
    super('Open My Wallet to track portfolio history on this device');
    this.name = 'RetryExhaustedError';
  }
}

export class LocalPortfolioUnavailableError extends Error {
  constructor() {
    super('Portfolio history is saved in the wallet app on this device.');
    this.name = 'LocalPortfolioUnavailableError';
  }
}

export function fetchNetWorthHistory() {
  return Promise.reject(new LocalPortfolioUnavailableError());
}

export function fetchPnlCumulativeHistory() {
  return Promise.reject(new LocalPortfolioUnavailableError());
}

export function fetchPnlHistory() {
  return Promise.reject(new LocalPortfolioUnavailableError());
}
