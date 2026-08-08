import { buildPortfolioBootstrapHoldings } from '../../../util/calculateFullBalance';
import { logDebugError } from '../../../util/logs';
import { callApi } from '../../../api';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateTokenNetWorthHistory, updateTokenPriceHistory } from '../../reducers/tokens';
import {
  selectAccountTokens,
  selectCurrentAccountId,
} from '../../selectors';

addActionHandler('loadPriceHistory', async (global, actions, payload) => {
  const { slug, period, currency = global.settings.baseCurrency } = payload ?? {};

  const history = await callApi('fetchPriceHistory', slug, period, currency);

  if (!history) {
    return;
  }

  global = getGlobal();
  global = updateTokenPriceHistory(global, slug, { [period]: history });
  setGlobal(global);
});

addActionHandler('loadTokenNetWorthHistory', async (global, actions, payload) => {
  const {
    slug,
    period,
    currency = global.settings.baseCurrency,
  } = payload;

  const currentAccountId = selectCurrentAccountId(global);
  const token = global.tokenInfo.bySlug[slug];
  if (!currentAccountId || !token) {
    return;
  }

  const tokens = selectAccountTokens(global, currentAccountId);
  const holdings = buildPortfolioBootstrapHoldings(tokens);
  const holding = holdings.find((item) => item.slug === slug);
  const currencyRate = Number(global.currencyRates[currency] || 1);
  const bootstrapPeriod = period === 'ALL' ? 'ALL' : '1Y';

  try {
    await callApi(
      'ensurePortfolioSnapshotsSeeded',
      currentAccountId,
      holdings,
      bootstrapPeriod,
    );
  } catch (err: any) {
    logDebugError('loadTokenNetWorthHistory.seed', err);
  }

  const history = await callApi(
    'fetchTokenNetWorthHistory',
    currentAccountId,
    slug,
    period,
    currency,
    {
      currencyRate,
      amount: holding?.amount,
    },
  ) ?? [];

  global = getGlobal();
  setGlobal(updateTokenNetWorthHistory(global, currentAccountId, slug, { [period]: history }));
});
