import { useEffect } from '../lib/teact/teact';

import { IS_TELEGRAM_APP } from '../config';
import { createSignal } from '../util/signals';
import { getTelegramAppAsync } from '../util/telegram';
import useLastCallback from './useLastCallback';

const [getIsInBackgroundLocal, setIsInBackground] = createSignal(!document.hasFocus());
export const getIsInBackground = getIsInBackgroundLocal;

function handleBlur() {
  setIsInBackground(true);
}

function handleFocus() {
  setIsInBackground(false);
}

/**
 * `blur`/`focus` alone leave the app wedged in background mode: mobile WebViews (iOS WKWebView especially) fire
 * `blur` when the app is backgrounded but frequently never fire the matching `focus` on resume. Background mode
 * is what switches the API worker's polling to its `notFocused` delays, so a missed `focus` stalls asset and
 * history refreshes for the rest of the session - the user has to restart the app.
 *
 * `visibilitychange` fires only on a real hidden <-> visible transition, so reacting to it recovers from a missed
 * `focus` without loosening the `blur` trigger that desktop auto-lock and animation pausing rely on.
 */
function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    setIsInBackground(true);
  } else {
    setIsInBackground(false);
  }
}

if (IS_TELEGRAM_APP) {
  void getTelegramAppAsync().then((telegramApp) => {
    telegramApp!.onEvent('activated', handleFocus);
    telegramApp!.onEvent('deactivated', handleBlur);
    setIsInBackground(!telegramApp?.isActive);
  });
} else {
  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // Restoring from the back/forward cache may skip `visibilitychange`.
  window.addEventListener('pageshow', handleVisibilityChange);
}

export default function useBackgroundMode(
  onBlur?: AnyToVoidFunction,
  onFocus?: AnyToVoidFunction,
  isDisabled = false,
) {
  const lastOnBlur = useLastCallback(onBlur);
  const lastOnFocus = useLastCallback(onFocus);

  useEffect(() => {
    if (isDisabled) {
      return undefined;
    }

    if (getIsInBackground()) {
      lastOnBlur();
    }

    return getIsInBackground.subscribe(() => {
      if (getIsInBackground()) {
        lastOnBlur();
      } else {
        lastOnFocus();
      }
    });
  }, [isDisabled, lastOnBlur, lastOnFocus]);
}

export function isBackgroundModeActive() {
  return getIsInBackground();
}
