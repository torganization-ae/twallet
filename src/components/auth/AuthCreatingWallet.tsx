import React, { memo } from '../../lib/teact/teact';
import { getActions } from '../../global';

import buildClassName from '../../util/buildClassName';
import { SECOND } from '../../util/dateFormat';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';

import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useMediaTransition from '../../hooks/useMediaTransition';
import useTimeout from '../../hooks/useTimeout';

import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';
import Button from '../ui/Button';

import styles from './Auth.module.scss';

interface OwnProps {
  isActive?: boolean;
  error?: string;
}

const START_DELAY = 700;
const INTERVAL = SECOND;

const AuthCreatingWallet = ({ isActive, error }: OwnProps) => {
  const { startCreatingWallet } = getActions();
  const lang = useLang();
  const [one, markOne] = useFlag();
  const [two, markTwo] = useFlag();
  const [three, markThree] = useFlag();

  useTimeout(markOne, isActive ? START_DELAY : undefined);
  useTimeout(markTwo, isActive ? START_DELAY + INTERVAL : undefined);
  useTimeout(markThree, isActive ? START_DELAY + INTERVAL * 2 : undefined);

  const oneRef = useMediaTransition<HTMLElement>(one);
  const twoRef = useMediaTransition<HTMLElement>(two);
  const threeRef = useMediaTransition<HTMLElement>(three);

  return (
    <div className={buildClassName(styles.container, 'custom-scroll')}>
      <AnimatedIconWithPreview
        play={isActive}
        tgsUrl={ANIMATED_STICKERS_PATHS.hello}
        previewUrl={ANIMATED_STICKERS_PATHS.helloPreview}
        nonInteractive
        noLoop={false}
      />
      <div className={styles.title}>{lang('Creating Wallet...')}</div>

      <div className={styles.counter}>
        <p className={styles.counterTitle}>{lang('On the count of three...')}</p>
        <b ref={oneRef} className={buildClassName(styles.counterDigit, 'rounded-font')}>1</b>
        <b ref={twoRef} className={buildClassName(styles.counterDigit, 'rounded-font')}>2</b>
        <b ref={threeRef} className={buildClassName(styles.counterDigit, 'rounded-font')}>3</b>
      </div>
      {error && (
        <>
          <p className={styles.createWalletError}>{lang(error)}</p>
          <Button
            isPrimary
            className={buildClassName(styles.btn, styles.createWalletRetry)}
            onClick={startCreatingWallet}
          >
            {lang('Try Again')}
          </Button>
        </>
      )}
    </div>
  );
};

export default memo(AuthCreatingWallet);
