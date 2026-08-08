import type { ApiPriceHistoryPeriod } from './backend';

export type ApiPortfolioHistoryList = Array<[number, number | null]>;

export type ApiPortfolioBootstrapHolding = {
  slug: string;
  /** Human-unit balance (wallet + staking). */
  amount: number;
  /** Current USD mark used when a price chart gap appears. */
  priceUsd: number;
};

export type ApiPortfolioHistoryParams = {
  // `from`/`to` accept ISO strings or unix-second numbers
  from?: number | string;
  to?: number | string;
  density?: string;
  // Local snapshot store key; falls back to `currentAccountId` in storage when omitted
  accountId?: string;
  // Multiply USD snapshot values into the requested base currency (default 1)
  currencyRate?: number;
  /**
   * When the local diary has fewer than two days, these holdings are combined with
   * network price charts to seed approximate historical snapshots once.
   */
  bootstrapHoldings?: ApiPortfolioBootstrapHolding[];
  /** Price-chart period used for the one-shot seed (default `1Y`). */
  bootstrapPeriod?: ApiPriceHistoryPeriod;
};

export type ApiPortfolioHistoryDataset = {
  assetId: number;
  symbol: string;
  contractAddress: string;
  color?: string;
  impact?: number;
  points: ApiPortfolioHistoryList;
};

export type ApiPortfolioHistoryResponse = {
  status: string;
  points?: ApiPortfolioHistoryList;
  datasets?: ApiPortfolioHistoryDataset[];
  base: string;
  density: string;
  historyScanCursor?: number;
  isAssetLimitExceeded?: boolean;
};

/*
  Why isn't the percentage sometimes listed on `ALL`, only the amount?

  Percent is a money-weighted return, meaning PnL divided by the average capital invested during the window.
  On a long `ALL`, if the wallet is almost completely withdrawn or heavily reshuffled by the end,
  the average capital averages out to almost zero, and the percentage becomes unreliable;
  a small denominator would inflate the percentage.
  In this case, we don't return the percentage, but the dollar amount is always returned.
  Similarly, if the calculation yields less than minus 100 percent, the spot wallet cannot lose more than the deposit.
 */
export type ApiPortfolioPnlChangeResponse = {
  status: string;
  base: string;
  amount: number;
  range?: string;
  percent?: number;
  startTs: number; // ms epoch of the first wallet activity in the window
  endTs: number;
  historyScanCursor?: number;
  isAssetLimitExceeded?: boolean;
};
