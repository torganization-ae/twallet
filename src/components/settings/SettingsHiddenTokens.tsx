import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { UserToken } from '../../global/types';

import { selectHiddenSpamTokens } from '../../global/selectors/tokens';
import buildClassName from '../../util/buildClassName';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useScrolledState from '../../hooks/useScrolledState';

import TokenIcon from '../common/TokenIcon';
import Button from '../ui/Button';
import SettingsHeader from './SettingsHeader';

import styles from './Settings.module.scss';

type OwnProps = {
  isActive?: boolean;
  onBackClick: NoneToVoidFunction;
};

type StateProps = {
  spamTokens: UserToken[];
};

function SettingsHiddenTokens({
  isActive,
  spamTokens,
  onBackClick,
}: OwnProps & StateProps) {
  const lang = useLang();
  const { toggleTokenVisibility } = getActions();

  useHistoryBack({
    isActive,
    onBack: onBackClick,
  });

  const { isScrolled, handleScroll: handleContentScroll } = useScrolledState();

  const handleUnhide = useLastCallback((slug: string) => {
    toggleTokenVisibility({ slug, shouldShow: true });
  });

  return (
    <div className={styles.slide}>
      <SettingsHeader
        title={lang('Spam / Dust')}
        isScrolled={isScrolled}
        onBackClick={onBackClick}
      />

      <div className={buildClassName(styles.content, 'custom-scroll')} onScroll={handleContentScroll}>
        <p className={styles.blockTitle}>{lang('Suspicious / Unknown')}</p>
        <p className={styles.itemSubtitle} style="padding: 0 1rem 0.75rem;">
          {lang('Do not interact with these tokens — they may be phishing.')}
        </p>

        <div className={styles.block}>
          {spamTokens.map((token) => (
            <div key={token.slug} className={buildClassName(styles.item, styles.itemMenu)}>
              <TokenIcon token={token} withChainIcon size="small" />
              <div className={styles.itemContent}>
                <span className={styles.itemTitle}>{token.name}</span>
                <span className={styles.itemSubtitle}>
                  {token.symbol}
                  {token.tokenAddress ? ` · ${token.tokenAddress.slice(0, 6)}…${token.tokenAddress.slice(-4)}` : ''}
                </span>
              </div>
              <Button isSmall onClick={() => handleUnhide(token.slug)}>
                {lang('Unhide')}
              </Button>
            </div>
          ))}
          {!spamTokens.length && (
            <div className={styles.itemContent} style="padding: 1rem;">
              <span className={styles.itemSubtitle}>{lang('No spam tokens')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  return {
    spamTokens: selectHiddenSpamTokens(global),
  };
})(SettingsHiddenTokens));
