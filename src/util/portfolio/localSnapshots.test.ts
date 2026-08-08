import {
  buildHistoryResponse,
  buildPnlChangeResponse,
  buildTokenNetWorthHistory,
  compactSnapshots,
  countSlugSnapshotsInWindow,
  countSnapshotsInWindow,
  getUtcDayTs,
  upsertSnapshot,
} from './localSnapshots';

const DAY_SEC = 24 * 60 * 60;

describe('localSnapshots', () => {
  it('overwrites the same UTC day on upsert', () => {
    const dayTs = getUtcDayTs(Date.UTC(2026, 0, 15));
    const first = upsertSnapshot([], { dayTs, totalUsd: 100 });
    const second = upsertSnapshot(first, { dayTs, totalUsd: 150, bySlug: { ton: 150 } });

    expect(second).toHaveLength(1);
    expect(second[0]).toEqual({ dayTs, totalUsd: 150, bySlug: { ton: 150 } });
  });

  it('strips bySlug older than 90 days on compact', () => {
    const nowDay = getUtcDayTs(Date.UTC(2026, 3, 1));
    const oldDay = nowDay - 100 * DAY_SEC;
    const recentDay = nowDay - 10 * DAY_SEC;

    const compacted = compactSnapshots([
      { dayTs: oldDay, totalUsd: 10, bySlug: { ton: 10 } },
      { dayTs: recentDay, totalUsd: 20, bySlug: { ton: 20 } },
    ], nowDay);

    expect(compacted[0].bySlug).toBeUndefined();
    expect(compacted[0].totalUsd).toBe(10);
    expect(compacted[1].bySlug).toEqual({ ton: 20 });
  });

  it('builds net-worth history with step-hold and currency conversion', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + DAY_SEC;
    const snapshots = [
      { dayTs: day1, totalUsd: 100 },
      { dayTs: day2, totalUsd: 120 },
    ];

    const response = buildHistoryResponse(
      snapshots,
      'EUR',
      {
        from: new Date(day1 * 1000).toISOString(),
        to: new Date((day2 + DAY_SEC - 1) * 1000).toISOString(),
        density: '1d',
      },
      'netWorth',
      2,
    );

    expect(response.status).toBe('ok');
    expect(response.base).toBe('eur');
    expect(response.datasets?.[0].points.some(([, value]) => value === 200)).toBe(true);
    expect(response.datasets?.[0].points.some(([, value]) => value === 240)).toBe(true);
  });

  it('builds daily and cumulative pnl from net-worth deltas', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + DAY_SEC;
    const day3 = day2 + DAY_SEC;
    const snapshots = [
      { dayTs: day1, totalUsd: 100 },
      { dayTs: day2, totalUsd: 130 },
      { dayTs: day3, totalUsd: 110 },
    ];
    const params = {
      from: new Date(day1 * 1000).toISOString(),
      to: new Date((day3 + DAY_SEC - 1) * 1000).toISOString(),
      density: '1d',
    };

    const daily = buildHistoryResponse(snapshots, 'USD', params, 'pnl');
    const cumulative = buildHistoryResponse(snapshots, 'USD', params, 'pnlCumulative');
    const dailyValues = daily.datasets![0].points.map(([, value]) => value);
    const cumulativeValues = cumulative.datasets![0].points.map(([, value]) => value);

    expect(dailyValues).toContain(30);
    expect(dailyValues).toContain(-20);
    expect(cumulativeValues).toContain(30);
    expect(cumulativeValues).toContain(10);
  });

  it('builds pnl-change amount and percent from first/last', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + 10 * DAY_SEC;
    const response = buildPnlChangeResponse(
      [
        { dayTs: day1, totalUsd: 100 },
        { dayTs: day2, totalUsd: 150 },
      ],
      'USD',
      {
        from: new Date(day1 * 1000).toISOString(),
        to: new Date((day2 + DAY_SEC - 1) * 1000).toISOString(),
        density: '1d',
      },
    );

    expect(response.amount).toBe(50);
    expect(response.percent).toBe(50);
  });

  it('returns stable empty responses without snapshots', () => {
    const response = buildHistoryResponse([], 'USD', { density: '1d' }, 'netWorth');
    const pnlChange = buildPnlChangeResponse([], 'USD', { density: '1d' });

    expect(response.datasets).toEqual([
      expect.objectContaining({ symbol: 'Total', points: expect.any(Array) }),
    ]);
    expect(pnlChange.amount).toBe(0);
    expect(pnlChange.percent).toBeUndefined();
  });

  it('zeros sold tokens instead of holding the previous bySlug value', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + DAY_SEC;
    const snapshots: Array<{ dayTs: number; totalUsd: number; bySlug: Record<string, number> }> = [
      { dayTs: day1, totalUsd: 100, bySlug: { toncoin: 60, usdt: 40 } },
      { dayTs: day2, totalUsd: 60, bySlug: { toncoin: 60 } },
    ];
    const response = buildHistoryResponse(
      snapshots,
      'USD',
      {
        from: new Date(day1 * 1000).toISOString(),
        to: new Date((day2 + DAY_SEC - 1) * 1000).toISOString(),
        density: '1d',
      },
      'netWorth',
    );

    const usdt = response.datasets!.find((dataset) => dataset.contractAddress === 'usdt');
    expect(usdt).toBeDefined();
    const lastUsdt = [...usdt!.points].reverse().find(([, value]) => typeof value === 'number')?.[1];
    expect(lastUsdt).toBe(0);
  });

  it('counts distinct snapshot days in the selected window', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + DAY_SEC;
    const snapshots = [
      { dayTs: day1, totalUsd: 1 },
      { dayTs: day2, totalUsd: 2 },
    ];

    expect(countSnapshotsInWindow(snapshots, {
      from: new Date(day1 * 1000).toISOString(),
      to: new Date((day2 + DAY_SEC - 1) * 1000).toISOString(),
      density: '1d',
    })).toBe(2);
    expect(countSnapshotsInWindow(snapshots, {
      from: new Date(day2 * 1000).toISOString(),
      to: new Date((day2 + DAY_SEC - 1) * 1000).toISOString(),
      density: '1d',
    })).toBe(1);
  });

  it('builds per-token net-worth history from local bySlug diary', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + DAY_SEC;
    const snapshots = [
      { dayTs: day1, totalUsd: 100, bySlug: { toncoin: 60, usdt: 40 } },
      { dayTs: day2, totalUsd: 90, bySlug: { toncoin: 70, usdt: 20 } },
    ];
    const params = {
      from: new Date(day1 * 1000).toISOString(),
      to: new Date((day2 + DAY_SEC - 1) * 1000).toISOString(),
      density: '1d',
    };

    expect(countSlugSnapshotsInWindow(snapshots, 'toncoin', params)).toBe(2);
    expect(buildTokenNetWorthHistory(snapshots, 'toncoin', params, 2)).toEqual([
      [day1, 120],
      [day2, 140],
    ]);
  });
});
