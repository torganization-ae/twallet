// Forces this file to be treated as a module (not a global script) so its top-level declarations
// (`setup`, ...) don't collide with same-named ones in other test files that also have no top-level
// import/export.
export {};

/**
 * `useBackgroundMode.ts` registers its `window`/`document` listeners as a side effect at module load
 * time, and `getIsInBackground` is backed by a module-level signal - so each test needs a fresh
 * module instance (`jest.resetModules()` + `require`) rather than a shared top-level `import`.
 */
function setup() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./useBackgroundMode') as typeof import('./useBackgroundMode');
}

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  });
}

describe('useBackgroundMode - background signal', () => {
  afterEach(() => {
    setVisibilityState('visible');
  });

  it('blur marks the app as backgrounded', () => {
    const { getIsInBackground } = setup();
    window.dispatchEvent(new Event('blur'));
    expect(getIsInBackground()).toBe(true);
  });

  it('focus marks the app as foregrounded', () => {
    const { getIsInBackground } = setup();
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    expect(getIsInBackground()).toBe(false);
  });

  it('visibilitychange to hidden marks the app as backgrounded, recovering a missed blur/focus pair', () => {
    const { getIsInBackground } = setup();
    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(getIsInBackground()).toBe(true);
  });

  it('visibilitychange to visible marks the app as foregrounded even without a matching `focus` event', () => {
    const { getIsInBackground } = setup();
    // Simulate the exact bug this fix targets: `blur` fired, but the matching `focus` never did.
    window.dispatchEvent(new Event('blur'));
    expect(getIsInBackground()).toBe(true);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(getIsInBackground()).toBe(false);
  });

  it('pageshow (back/forward cache restore) marks the app as foregrounded', () => {
    const { getIsInBackground } = setup();
    window.dispatchEvent(new Event('blur'));
    expect(getIsInBackground()).toBe(true);

    setVisibilityState('visible');
    window.dispatchEvent(new Event('pageshow'));

    expect(getIsInBackground()).toBe(false);
  });

  it('isBackgroundModeActive mirrors getIsInBackground', () => {
    const { isBackgroundModeActive } = setup();
    window.dispatchEvent(new Event('blur'));
    expect(isBackgroundModeActive()).toBe(true);
  });
});
