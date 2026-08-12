import React, { memo, type TeactNode } from '../../lib/teact/teact';

import type { ApiSwapAsset, ApiToken } from '../../api/types';
import type { UserSwapToken, UserToken } from '../../global/types';

import { TONCOIN } from '../../config';
import buildClassName from '../../util/buildClassName';
import { findChainConfig } from '../../util/chain';
import getChainNetworkIcon from '../../util/swap/getChainNetworkIcon';
import { getIsNativeToken, getIsRwaStockToken } from '../../util/tokens';

import useFlag from '../../hooks/useFlag';

import gramIcon from '../../assets/token_gram.svg';

import styles from './TokenIcon.module.scss';

interface OwnProps {
  token: UserToken | UserSwapToken | ApiSwapAsset | ApiToken;
  withChainIcon?: boolean;
  withChainColorRing?: boolean;
  size?: 'x-small' | 'small' | 'middle' | 'large' | 'x-large';
  className?: string;
  iconClassName?: string;
  children?: TeactNode;
}

function TokenIcon({
  token, size, withChainIcon, withChainColorRing, className, iconClassName, children,
}: OwnProps) {
  const { symbol, image, chain, slug } = token;
  const [isLoadingError, markLoadingError] = useFlag();
  const isNativeToken = getIsNativeToken(slug);
  // Gram always shows the bundled brand logo (the DeDust asset list serves the old TON one). Other native tokens
  // have no `image` in the config and the backend asset list that used to supply one is off (`NO_BACKEND`),
  // so the chain icon stands in.
  const imageUrl = slug === TONCOIN.slug
    ? gramIcon
    : image || (isNativeToken && chain ? getChainNetworkIcon(chain) : undefined);
  const shouldRenderImage = Boolean(imageUrl) && !isLoadingError;
  const shapeClassName = getIsRwaStockToken(token) ? styles.square : styles.circle;
  const iconFullClassName = buildClassName(styles.icon, size && styles[size], shapeClassName, iconClassName);
  const chainColor = withChainColorRing && chain
    ? findChainConfig(chain)?.displayColor
    : undefined;

  function renderDefaultIcon() {
    return (
      <div className={buildClassName(iconFullClassName, styles.fallbackIcon)}>
        {symbol.slice(0, 1)}
      </div>
    );
  }

  return (
    <div
      className={buildClassName(styles.wrapper, className)}
      style={chainColor ? `--token-chain-ring: ${chainColor}` : undefined}
    >
      {
        shouldRenderImage ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={symbol}
            className={buildClassName(iconFullClassName, chainColor && styles.withChainRing)}
            draggable={false}
            onError={markLoadingError}
          />
        ) : renderDefaultIcon()
      }
      {withChainIcon && !isNativeToken && chain && (
        <img
          src={getChainNetworkIcon(chain)}
          alt=""
          className={buildClassName(styles.blockchainIcon, size && styles[size])}
          draggable={false}
        />
      )}
      {children}
    </div>
  );
}

export default memo(TokenIcon);
