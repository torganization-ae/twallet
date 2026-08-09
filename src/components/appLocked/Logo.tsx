import React, { memo } from '../../lib/teact/teact';

import useLang from '../../hooks/useLang';

import Image from '../ui/Image';

import styles from './AppLocked.module.scss';

import logoWebpPath from '../../assets/logo.webp';

function Logo() {
  const lang = useLang();

  return (
    <div className={styles.logo}>
      <Image className={styles.logo} imageClassName={styles.logo} url={logoWebpPath} alt={lang('Logo')} />
    </div>
  );
}

export default memo(Logo);
