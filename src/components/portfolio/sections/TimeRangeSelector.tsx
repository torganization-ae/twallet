import React, { memo } from '../../../lib/teact/teact';

import type { ApiPriceHistoryPeriod } from '../../../api/types';

import buildClassName from '../../../util/buildClassName';
import buildStyle from '../../../util/buildStyle';
import { PORTFOLIO_TIME_RANGES } from '../../../util/portfolio/timeRange';
import { SWIPE_DISABLED_CLASS_NAME } from '../../../util/swipeController';

import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import useDraggablePill from '../../main/sections/Actions/hooks/useDraggablePill';

import Pill from '../../main/sections/Actions/Pill';

import styles from './TimeRangeSelector.module.scss';

interface RangeButtonProps {
  range: ApiPriceHistoryPeriod;
  isActive: boolean;
  isSelected: boolean;
  label: string;
  onClick: (range: ApiPriceHistoryPeriod) => void;
}

interface OwnProps {
  value: ApiPriceHistoryPeriod;
  isCustomActive?: boolean;
  onChange: (range: ApiPriceHistoryPeriod) => void;
  onCalendarClick: NoneToVoidFunction;
}

const TAB_COUNT = PORTFOLIO_TIME_RANGES.length;

// The range value matches the backend (`1D/7D/…`); these are the short display labels
const RANGE_LABEL_KEYS: Record<ApiPriceHistoryPeriod, string> = {
  ALL: 'All',
  '1Y': 'Y',
  '3M': '3M',
  '1M': 'M',
  '7D': 'W',
  '1D': 'D',
};

function TimeRangeSelector({
  value,
  isCustomActive,
  onChange,
  onCalendarClick,
}: OwnProps) {
  const lang = useLang();

  const activeIndex = isCustomActive ? -1 : Math.max(0, PORTFOLIO_TIME_RANGES.indexOf(value));

  const handleCommit = useLastCallback((index: number) => {
    const range = PORTFOLIO_TIME_RANGES[index];
    if (range !== undefined) onChange(range);
  });

  const {
    capsuleRef,
    isDragging,
    squeeze,
    renderedActiveIndex,
    pointerHandlers,
  } = useDraggablePill({
    tabCount: TAB_COUNT,
    activeIndex: Math.max(0, activeIndex),
    onCommit: handleCommit,
  });

  const rootStyle = buildStyle(
    `--tab-count: ${TAB_COUNT}`,
    `--active-index: ${activeIndex < 0 ? 0 : activeIndex}`,
  );

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={buildClassName(styles.calendarButton, isCustomActive && styles.calendarButtonActive)}
        aria-label={lang('Custom Date Range')}
        aria-pressed={Boolean(isCustomActive)}
        onClick={onCalendarClick}
      >
        <svg className={styles.calendarIcon} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
          />
        </svg>
      </button>

      <div
        ref={capsuleRef}
        role="tablist"
        className={buildClassName(
          styles.root,
          isDragging && styles.dragging,
          isCustomActive && styles.customActive,
          SWIPE_DISABLED_CLASS_NAME,
        )}
        style={rootStyle}
        {...pointerHandlers}
      >
        {!isCustomActive && <Pill isDragging={isDragging} squeeze={squeeze} />}
        {PORTFOLIO_TIME_RANGES.map((range, index) => (
          <RangeButton
            key={range}
            range={range}
            isActive={!isCustomActive && renderedActiveIndex === index}
            isSelected={!isCustomActive && range === value}
            label={lang(RANGE_LABEL_KEYS[range])}
            onClick={onChange}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(TimeRangeSelector);

const RangeButton = memo(({
  range, isActive, isSelected, label, onClick,
}: RangeButtonProps) => {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={buildClassName(styles.option, isActive && styles.optionActive)}
      onClick={() => onClick(range)}
    >
      {label}
    </button>
  );
});
