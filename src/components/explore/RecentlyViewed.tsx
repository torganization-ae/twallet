import React, { memo, useMemo, useRef } from '../../lib/teact/teact';

import type { ApiSite } from '../../api/types';

import { BROWSER_HISTORY_LIMIT } from '../../config';
import buildClassName from '../../util/buildClassName';
import { stopEvent } from '../../util/domEvents';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import { openSite, resolveHistorySite } from './helpers/utils';

import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import useLang from '../../hooks/useLang';

import Image from '../ui/Image';

import styles from './Category.module.scss';

interface OwnProps {
  browserHistory?: string[];
  sites?: ApiSite[];
}

function RecentlyViewed({ browserHistory, sites }: OwnProps) {
  const lang = useLang();
  const containerRef = useRef<HTMLDivElement>();

  const items = useMemo(() => {
    return (browserHistory || [])
      .slice(0, BROWSER_HISTORY_LIMIT)
      .map((url) => resolveHistorySite(url, sites));
  }, [browserHistory, sites]);

  useHorizontalScroll({
    containerRef,
    isDisabled: IS_TOUCH_ENV || items.length === 0,
    shouldPreventDefault: true,
  });

  if (!items.length) {
    return undefined;
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.header}>
        <span className={styles.headerTitle}>{lang('Recently Viewed')}</span>
      </h3>

      <div className={buildClassName(styles.list, 'no-swipe')} ref={containerRef}>
        {items.map((site) => (
          <button
            key={site.url}
            type="button"
            className={styles.site}
            onClick={(e: React.MouseEvent) => {
              stopEvent(e);
              openSite(site.url, site.isExternal, site.name);
            }}
          >
            {site.icon ? (
              <Image
                url={site.icon}
                alt={site.name}
                className={styles.iconWrapper}
                imageClassName={styles.icon}
              />
            ) : (
              <span className={buildClassName(styles.iconWrapper, styles.placeholderIcon)}>
                <i className="icon-globe" aria-hidden />
              </span>
            )}
            <span className={styles.siteName}>{site.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(RecentlyViewed);
