import React, { memo, useEffect } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { OwnProps as AnimatedIconProps } from './AnimatedIcon';

import { ANIMATION_LEVEL_MIN } from '../../config';
import buildClassName from '../../util/buildClassName';
import buildStyle from '../../util/buildStyle';

import useFlag from '../../hooks/useFlag';
import useLastCallback from '../../hooks/useLastCallback';
import useMediaTransition from '../../hooks/useMediaTransition';

import AnimatedIcon from './AnimatedIcon';

import styles from './AnimatedIconWithPreview.module.scss';

type OwnProps
  = Partial<AnimatedIconProps>
    & {
      iconPreviewClass?: string;
      previewUrl?: string;
      thumbDataUri?: string;
      noPreviewTransition?: boolean;
    };

interface StateProps {
  noAnimation?: boolean;
}

const loadedPreviewUrls = new Set();
const DEFAULT_SIZE = 150;

// `previewUrl` can come from untrusted sources (e.g. NFT metadata), and it's interpolated into a raw
// CSS string below (`style.cssText`), so an unescaped quote could break out of the `url("...")` context
// and inject arbitrary CSS. Backslash-escaping `\` and `"` is the standard CSS string-escaping rule.
function escapeCssUrl(url: string) {
  return url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function AnimatedIconWithPreview(props: OwnProps & StateProps) {
  const {
    size = DEFAULT_SIZE,
    previewUrl,
    iconPreviewClass,
    thumbDataUri,
    className,
    noAnimation,
    noPreviewTransition,
    ...otherProps
  } = props;

  // The worker paints every pixel of the animation with this color, keeping only the alpha
  // (see `applyColor` in `rlottie.worker`), so a colored animation is just its own silhouette.
  // The preview is a still of the *uncolored* animation, so it has to be tinted the same way —
  // otherwise its baked-in color shows until the animation loads and then visibly changes.
  const tintColor = otherProps.color;

  const [isPreviewLoaded, markPreviewLoaded] = useFlag(
    Boolean(iconPreviewClass) || Boolean(thumbDataUri) || loadedPreviewUrls.has(previewUrl),
  );
  const ref = useMediaTransition(isPreviewLoaded || noPreviewTransition);
  const [isAnimationReady, markAnimationReady, markAnimationNotReady] = useFlag(false);

  useEffect(() => {
    if (noAnimation) {
      markAnimationNotReady();
    }
  }, [markAnimationNotReady, noAnimation]);

  const handlePreviewLoad = useLastCallback(() => {
    markPreviewLoaded();
    loadedPreviewUrls.add(previewUrl);
  });

  return (
    <div
      ref={!noPreviewTransition ? ref : undefined}
      className={buildClassName(className, styles.root)}
      style={buildStyle(
        size !== undefined && !otherProps.shouldStretch && `width: ${size}px; height: ${size}px;`,
      )}
      data-preview-url={previewUrl}
    >
      {thumbDataUri && !previewUrl && !isAnimationReady && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img src={thumbDataUri} className={styles.preview} />
      )}
      {previewUrl && !isAnimationReady && (tintColor ? (
        <>
          {/* Zero-sized and never painted: it only exists to load the image and fire `onLoad`,
              so the mask below is applied from cache and can't flash while it is still loading. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={previewUrl} className={styles.previewLoader} onLoad={handlePreviewLoad} aria-hidden />
          {isPreviewLoaded && (
            <span
              className={buildClassName(styles.preview, styles.previewTinted)}
              style={buildStyle(
                `background-color: ${tintColor}`,
                `-webkit-mask-image: url("${escapeCssUrl(previewUrl)}")`,
                `mask-image: url("${escapeCssUrl(previewUrl)}")`,
              )}
              aria-hidden
            />
          )}
        </>
      ) : (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={previewUrl}
          className={styles.preview}
          onLoad={handlePreviewLoad}
        />
      ))}
      {iconPreviewClass && !isAnimationReady && (
        <i className={buildClassName(styles.preview, iconPreviewClass)} aria-hidden />
      )}
      {!noAnimation && <AnimatedIcon size={size} {...otherProps} onLoad={markAnimationReady} noTransition />}
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  return {
    noAnimation: global.settings.animationLevel === ANIMATION_LEVEL_MIN,
  };
})(AnimatedIconWithPreview));
