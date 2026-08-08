import { buildBootstrapSnapshots, pickBootstrapHoldings } from './bootstrapSnapshots';
import { getUtcDayTs } from './localSnapshots';

const DAY_SEC = 24 * 60 * 60;

describe('bootstrapSnapshots', () => {
  it('keeps only the heaviest holdings', () => {
    const picked = pickBootstrapHoldings([
      { slug: 'dust', amount: 1, priceUsd: 0.001 },
      { slug: 'toncoin', amount: 10, priceUsd: 5 },
      { slug: 'usdt', amount: 100, priceUsd: 1 },
    ]);

    expect(picked.map((item) => item.slug)).toEqual(['usdt', 'toncoin']);
  });

  it('builds daily snapshots from prices without overwriting existing days', () => {
    const day1 = getUtcDayTs(Date.UTC(2026, 0, 1));
    const day2 = day1 + DAY_SEC;
    const day3 = day2 + DAY_SEC;

    const seeded = buildBootstrapSnapshots(
      [{ slug: 'toncoin', amount: 2, priceUsd: 5 }],
      {
        toncoin: [
          [day1, 4],
          [day2, 5],
          [day3, 6],
        ],
      },
      [{ dayTs: day3, totalUsd: 20, bySlug: { toncoin: 20 } }],
      day3 * 1000,
    );

    expect(seeded).toEqual([
      { dayTs: day1, totalUsd: 8, bySlug: { toncoin: 8 } },
      { dayTs: day2, totalUsd: 10, bySlug: { toncoin: 10 } },
    ]);
  });

  it('falls back to current priceUsd when history is missing', () => {
    const day = getUtcDayTs(Date.UTC(2026, 0, 10));
    const seeded = buildBootstrapSnapshots(
      [{ slug: 'toncoin', amount: 3, priceUsd: 7 }],
      {},
      [],
      day * 1000,
    );

    expect(seeded).toEqual([
      { dayTs: day, totalUsd: 21, bySlug: { toncoin: 21 } },
    ]);
  });
});
