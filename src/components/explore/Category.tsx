import React, { memo, useRef } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { ApiSite, ApiSiteCategory } from '../../api/types';

import buildClassName from '../../util/buildClassName';
import { stopEvent } from '../../util/domEvents';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import { openSite } from './helpers/utils';

import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import useLang from '../../hooks/useLang';

import Image from '../ui/Image';

import styles from './Category.module.scss';

interface OwnProps {
  category: ApiSiteCategory;
  sites: ApiSite[];
}

function Category({ category, sites }: OwnProps) {
  const { openSiteCategory } = getActions();

  const lang = useLang();
  const containerRef = useRef<HTMLDivElement>();

  useHorizontalScroll({
    containerRef,
    isDisabled: IS_TOUCH_ENV || sites.length === 0,
    shouldPreventDefault: true,
  });

  function handleCategoryClick() {
    openSiteCategory({ id: category.id });
  }

  return (
    <div className={styles.root}>
      <h3
        className={styles.header}
        role="button"
        tabIndex={0}
        onClick={handleCategoryClick}
      >
        <span className={styles.headerTitle}>{lang(category.name)}</span>
        <i className={buildClassName(styles.headerChevron, 'icon-chevron-right')} aria-hidden />
      </h3>

      <div className={buildClassName(styles.list, 'no-swipe')} ref={containerRef}>
        {sites.map((site) => (
          <button
            key={`${site.url}-${site.name}`}
            type="button"
            className={styles.site}
            onClick={(e: React.MouseEvent) => {
              stopEvent(e);
              openSite(site.url, site.isExternal, site.name);
            }}
          >
            <Image
              url={site.icon}
              alt={site.name}
              className={styles.iconWrapper}
              imageClassName={styles.icon}
            />
            <span className={styles.siteName}>{site.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(Category);
