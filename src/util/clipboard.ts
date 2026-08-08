import { IS_TELEGRAM_APP } from '../config';
import { vibrate } from './haptics';
import { getTelegramApp } from './telegram';

const textCopyEl = document.createElement('textarea');
textCopyEl.setAttribute('readonly', '');
textCopyEl.tabIndex = -1;
textCopyEl.className = 'visually-hidden';

export const copyTextToClipboard = (str: string): Promise<void> => {
  vibrate();

  if (window.electron?.writeTextToClipboard) {
    return window.electron.writeTextToClipboard(str);
  }

  return navigator.clipboard.writeText(str);
};

export async function readClipboardContent() {
  if (IS_TELEGRAM_APP) {
    const telegramApp = getTelegramApp();
    if (!telegramApp) {
      throw new Error('Telegram Mini-App is unavailable');
    }

    return new Promise((resolve: ({ text, type }: { text: string; type: string | undefined }) => void) => {
      telegramApp.readTextFromClipboard((text) => {
        vibrate();
        resolve({ text: text ?? '', type: 'text/plain' });
      });
    });
  }

  // Electron native clipboard works without document focus / Permissions API prompts.
  if (window.electron?.readTextFromClipboard) {
    const text = await window.electron.readTextFromClipboard();
    return { text: text ?? '', type: 'text/plain' };
  }

  return readBrowserClipboardText();
}

async function readBrowserClipboardText() {
  ensureDocumentFocus();

  try {
    const text = await navigator.clipboard.readText();
    return { text, type: 'text/plain' as const };
  } catch (err) {
    // Common in Electron/Linux and embedded webviews when the first click did not focus the document.
    if (isClipboardFocusError(err)) {
      ensureDocumentFocus();
      const text = await navigator.clipboard.readText();
      return { text, type: 'text/plain' as const };
    }

    throw err;
  }
}

function ensureDocumentFocus() {
  if (!document.hasFocus()) {
    window.focus();
  }
}

export function isClipboardFocusError(err: unknown): boolean {
  return err instanceof DOMException
    && err.name === 'NotAllowedError'
    && /not focused/i.test(err.message);
}

/** Hide paste button only when the browser permanently rejects clipboard access. */
export function shouldHidePasteButtonAfterClipboardError(err: unknown): boolean {
  if (!(err instanceof DOMException) || err.name !== 'NotAllowedError') {
    return false;
  }

  return !isClipboardFocusError(err);
}
