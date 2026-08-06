import React, { type ElementRef, memo } from '../../../../lib/teact/teact';

import type { ApiBackendConfig } from '../../../../api/types/backend';
import type { DropdownItem } from '../../../ui/Dropdown';

import buildClassName from '../../../../util/buildClassName';

import WithContextMenu from '../../../ui/WithContextMenu';

import styles from './Card.module.scss';

interface OwnProps {
  animationLevel: number;
  seasonalTheme?: ApiBackendConfig['seasonalTheme'];
  isSeasonalThemingDisabled?: boolean;
  seasonalContextMenuItems: DropdownItem<'disable'>[];
  onDisableSeasonalTheming: NoneToVoidFunction;
}

function SeasonalTheming({
  animationLevel,
  seasonalTheme,
  isSeasonalThemingDisabled,
  seasonalContextMenuItems,
  onDisableSeasonalTheming,
}: OwnProps) {
  if (isSeasonalThemingDisabled || !seasonalTheme) {
    return undefined;
  }

  return (
    <WithContextMenu
      layout={{
        isCenteredHorizontally: false,
        doNotCoverTrigger: false,
      }}
      items={seasonalContextMenuItems}
      onItemClick={onDisableSeasonalTheming}
    >
      {(menuProps) => (
        <div
          ref={menuProps.ref as ElementRef<HTMLDivElement>}
          onMouseDown={menuProps.onMouseDown}
          onContextMenu={menuProps.onContextMenu}
          className={buildClassName(styles.seasonalPlaceholder, menuProps.className)}
        />
      )}
    </WithContextMenu>
  );
}

export default memo(SeasonalTheming);
