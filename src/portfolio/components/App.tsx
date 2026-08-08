import React, { memo, useEffect, useLayoutEffect, useState } from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';
import {
  IS_ANDROID,
  IS_IOS,
  IS_LINUX,
  IS_MAC_OS,
  IS_OPERA,
  IS_SAFARI,
  IS_WINDOWS,
} from '../../util/windowEnvironment';
import { fetchNetWorthHistory } from '../utils/api';

import Transition from '../../components/ui/Transition';
import LoadingPage from './LoadingPage';

import styles from './App.module.scss';

type OwnProps = {
  addresses?: string;
  baseCurrency?: string;
};

enum PageKey {
  Loading,
  Chart,
}

function App({ addresses, baseCurrency = 'USD' }: OwnProps) {
  const [chartError, setChartError] = useState<string>();
  const [renderKey, setRenderKey] = useState<PageKey>(PageKey.Loading);

  useLayoutEffect(applyDocumentClasses, []);

  useEffect(() => {
    void fetchNetWorthHistory()
      .catch((err: Error) => {
        setChartError(err.message);
        setRenderKey(PageKey.Chart);
      });
  }, [addresses, baseCurrency]);

  function renderPage() {
    switch (renderKey) {
      case PageKey.Chart:
        return (
          <div className={styles.error}>
            <div className={styles.errorTitle}>Portfolio</div>
            <div className={styles.errorSubtitle}>
              {chartError || 'Portfolio history is saved in the wallet app on this device.'}
            </div>
          </div>
        );

      default:
        return <LoadingPage />;
    }
  }

  return (
    <div className={styles.app}>
      <Transition
        name="fade"
        activeKey={renderKey}
        slideClassName={buildClassName(styles.appSlide, 'custom-scroll')}
      >
        {renderPage}
      </Transition>
    </div>
  );
}

export default memo(App);

function applyDocumentClasses() {
  const { documentElement } = document;

  documentElement.classList.add('is-rendered');

  if (IS_IOS) {
    documentElement.classList.add('is-ios', 'is-mobile');
  } else if (IS_ANDROID) {
    documentElement.classList.add('is-android', 'is-mobile');
  } else if (IS_MAC_OS) {
    documentElement.classList.add('is-macos');
  } else if (IS_WINDOWS) {
    documentElement.classList.add('is-windows');
  } else if (IS_LINUX) {
    documentElement.classList.add('is-linux');
  }
  if (IS_SAFARI) {
    documentElement.classList.add('is-safari');
  }
  if (IS_OPERA) {
    documentElement.classList.add('is-opera');
  }
}
