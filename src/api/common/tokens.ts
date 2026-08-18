import {
  type ApiChain,
  type ApiTokenDetails,
  type ApiTokenWithMaybePrice,
  type ApiTokenWithPrice,
  type OnApiUpdate,
} from '../types';

import { POPULAR_SWAP_TOKENS } from '../../config';
import { getTokenInfo } from '../../util/chain';
import Deferred from '../../util/Deferred';
import { buildCollectionByKey, omitUndefined } from '../../util/iteratees';
import { tokenRepository } from '../db';

const POPULAR_TOKEN_IMAGES: Record<string, string> = Object.fromEntries(
  POPULAR_SWAP_TOKENS.filter(({ image }) => image).map(({ slug, image }) => [slug, image!]),
);

export const tokensPreload = new Deferred();
const tokensCache: {
  bySlug: Record<string, ApiTokenWithPrice>;
} = {
  bySlug: { ...getTokenInfo() },
};

export async function loadTokensCache() {
  try {
    const tokens = await tokenRepository.all();
    // Metadata only: last-session quotes must not paint the UI if `/assets` fails this launch.
    await updateTokens(tokens.map((token) => ({ ...token, priceUsd: 0, percentChange24h: 0 })));
  } finally {
    tokensPreload.resolve();
  }
}

/** Drop every cached quote so the UI shows 0 until `/assets` succeeds. */
export function clearTokenPrices(sendUpdate?: NoneToVoidFunction) {
  for (const [slug, token] of Object.entries(tokensCache.bySlug)) {
    tokensCache.bySlug[slug] = { ...token, priceUsd: 0, percentChange24h: 0 };
  }
  sendUpdate?.();
}

export async function updateTokens(
  tokens: ApiTokenWithMaybePrice[],
  sendUpdate?: NoneToVoidFunction,
  tokenDetails?: ApiTokenDetails[],
  shouldSendUpdate?: boolean,
) {
  const tokensForDb: ApiTokenWithPrice[] = [];
  const detailsBySlug = buildCollectionByKey(tokenDetails ?? [], 'slug');

  for (const { slug, ...details } of tokenDetails ?? []) {
    const cachedToken = tokensCache.bySlug[slug] as ApiTokenWithPrice | undefined;
    if (cachedToken) {
      const token = { ...cachedToken, ...details };
      tokensCache.bySlug[slug] = token;
      tokensForDb.push(token);
    }
  }

  for (const token of tokens) {
    const { slug } = token;
    const cachedToken = tokensCache.bySlug[slug] as ApiTokenWithPrice | undefined;
    const mergedToken = mergeTokenWithCache(token, detailsBySlug, cachedToken);

    // Any call that passes `sendUpdate` re-publishes the whole registry to the UI, unconditionally. The
    // redundancy is deliberate and load-bearing: the UI prunes `tokenInfo` down to the slugs in use when it
    // persists state (`reducedGlobal.tokenInfo` in `src/global/cache.ts`), and both asset lists hide any balance
    // whose slug is missing from `tokenInfo`. Re-sending on every balance poll is what repairs a pruned registry
    // when the backend `/assets` call is unavailable and cannot force the update itself. The reducer
    // deep-compares before storing, so an unchanged payload costs a message and nothing else.
    //
    // (The original condition here read `token.slug in tokensCache`, testing the `{ bySlug }` wrapper rather
    // than the map inside it, so it was never false. Made explicit rather than "fixed" - narrowing it to a
    // real change check reintroduces the invisible-token bug above.)
    shouldSendUpdate = true;

    // The popular swap list ships its own logos, because the ones these tokens carry themselves are often
    // `ipfs://` (or SVG) images that only the web UI can render.
    const popularImage = POPULAR_TOKEN_IMAGES[slug];
    if (popularImage) {
      mergedToken.image = popularImage;
    }

    tokensCache.bySlug[token.slug] = mergedToken;
    if (token.tokenAddress) {
      tokensForDb.push(mergedToken);
    }
  }

  await tokenRepository.bulkPut(tokensForDb);

  if (shouldSendUpdate && sendUpdate) {
    sendUpdate();
  }
}

function mergeTokenWithCache(
  token: ApiTokenWithMaybePrice,
  detailsBySlug: Record<string, ApiTokenDetails>,
  cachedToken?: ApiTokenWithPrice,
): ApiTokenWithPrice {
  if (cachedToken) {
    // Metadata from backend takes priority (e.g., image)
    return {
      ...omitUndefined(token.isFromBackend ? cachedToken : token),
      ...omitUndefined(token.isFromBackend ? token : cachedToken),
      priceUsd: token.priceUsd ?? cachedToken.priceUsd,
      percentChange24h: token.percentChange24h ?? cachedToken.percentChange24h,
      // For the scenario where the token was cached previously, but now it's disabled
      ...omitUndefined((detailsBySlug[token.slug] as ApiTokenDetails | undefined) ?? {}),
      ...(token.slug in detailsBySlug && { isFromBackend: undefined }),
    };
  } else if (token.slug in detailsBySlug) {
    return {
      ...token,
      ...detailsBySlug[token.slug],
      isFromBackend: undefined,
    };
  } else {
    return {
      ...token,
      priceUsd: token.priceUsd ?? 0,
      percentChange24h: token.percentChange24h ?? 0,
    };
  }
}

export function getTokensCache() {
  return tokensCache;
}

/** Note that this function may return `undefined` if the token is not found (e.g. pTON) */
export function getTokenBySlug(slug: string): ApiTokenWithPrice | undefined {
  return tokensCache.bySlug[slug];
}

export function getTokenByAddress(tokenAddress: string, chain?: ApiChain) {
  return getTokenBySlug(buildTokenSlug(chain ?? 'ton', tokenAddress));
}

export function sendUpdateTokens(onUpdate: OnApiUpdate) {
  onUpdate({
    type: 'updateTokens',
    tokens: tokensCache.bySlug,
  });
}

export function buildTokenSlug(chain: ApiChain, address: string) {
  const addressPart = address.replace(/[^a-z\d]/gi, '').slice(0, 10);
  return `${chain}-${addressPart}`.toLowerCase();
}
