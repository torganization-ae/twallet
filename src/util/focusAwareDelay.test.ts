// Forces this file to be treated as a module (not a global script) so its top-level declarations
// (`setup`, ...) don't collide with same-named ones in other test files that also have no top-level
// import/export.
export {};

/**
 * Every test loads a fresh module instance (`jest.resetModules()` + `require`) rather than a shared
 * top-level `import`, since this module holds module-level singleton state (`isFocused`, the
 * `focusListeners` set) that would otherwise leak between tests.
 */
function setup() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./focusAwareDelay') as typeof import('./focusAwareDelay');
}

describe('setIsAppFocused / getIsAppFocused', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts focused by default', () => {
    const { getIsAppFocused } = setup();
    expect(getIsAppFocused()).toBe(true);
  });

  it('updates the state on a real change', () => {
    const { setIsAppFocused, getIsAppFocused } = setup();
    setIsAppFocused(false);
    expect(getIsAppFocused()).toBe(false);
    setIsAppFocused(true);
    expect(getIsAppFocused()).toBe(true);
  });

  it('is a no-op (does not notify onAppFocus listeners) when the value is unchanged', () => {
    const { setIsAppFocused, onAppFocus } = setup();
    const listener = jest.fn();
    onAppFocus(listener);

    // Already focused by default; setting the same value must not fire the listener.
    setIsAppFocused(true);
    expect(listener).not.toHaveBeenCalled();

    setIsAppFocused(false);
    // Going to "unfocused" never fires the focus listener, by design.
    expect(listener).not.toHaveBeenCalled();

    // Repeating "unfocused" is also a no-op.
    setIsAppFocused(false);
    expect(listener).not.toHaveBeenCalled();

    // An actual focus transition fires it.
    setIsAppFocused(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('onAppFocus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires on every focus transition, not just the first (persistent subscription)', () => {
    const { setIsAppFocused, onAppFocus } = setup();
    const listener = jest.fn();
    onAppFocus(listener);

    setIsAppFocused(false);
    setIsAppFocused(true);
    setIsAppFocused(false);
    setIsAppFocused(true);
    setIsAppFocused(false);
    setIsAppFocused(true);

    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('stops firing after unsubscribing', () => {
    const { setIsAppFocused, onAppFocus } = setup();
    const listener = jest.fn();
    const unsubscribe = onAppFocus(listener);

    setIsAppFocused(false);
    setIsAppFocused(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    setIsAppFocused(false);
    setIsAppFocused(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('onFocusAwareDelay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires at `ms` when the app is focused', async () => {
    const { onFocusAwareDelay } = setup();
    const cb = jest.fn();
    onFocusAwareDelay(1000, 5000, cb);

    await jest.advanceTimersByTimeAsync(999);
    expect(cb).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('when not focused at `ms`, waits for a focus event before `forceMs`', async () => {
    const { setIsAppFocused, onFocusAwareDelay } = setup();
    setIsAppFocused(false);
    const cb = jest.fn();
    onFocusAwareDelay(1000, 5000, cb);

    await jest.advanceTimersByTimeAsync(1000);
    expect(cb).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(3999);
    expect(cb).not.toHaveBeenCalled();

    setIsAppFocused(true);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('when not focused at `ms` and focus never returns, fires at `forceMs` regardless', async () => {
    const { setIsAppFocused, onFocusAwareDelay } = setup();
    setIsAppFocused(false);
    const cb = jest.fn();
    onFocusAwareDelay(1000, 5000, cb);

    await jest.advanceTimersByTimeAsync(4999);
    expect(cb).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('the returned cancel function stops a pending stage-1 wait', async () => {
    const { onFocusAwareDelay } = setup();
    const cb = jest.fn();
    const cancel = onFocusAwareDelay(1000, 5000, cb);

    cancel();
    await jest.advanceTimersByTimeAsync(5000);

    expect(cb).not.toHaveBeenCalled();
  });

  it(
    'the returned cancel function stops a pending stage-2 wait (both the focus listener and the forceMs timer)',
    async () => {
      const { setIsAppFocused, onFocusAwareDelay } = setup();
      setIsAppFocused(false);
      const cb = jest.fn();
      const cancel = onFocusAwareDelay(1000, 5000, cb);

      await jest.advanceTimersByTimeAsync(1000);
      cancel();

      // Neither a later focus event nor reaching forceMs should fire it now.
      setIsAppFocused(true);
      await jest.advanceTimersByTimeAsync(5000);

      expect(cb).not.toHaveBeenCalled();
    });
});

describe('focusAwareDelay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves at `ms` when focused', async () => {
    const { focusAwareDelay } = setup();
    const resolved = jest.fn();
    void focusAwareDelay(1000, 5000).then(resolved);

    await jest.advanceTimersByTimeAsync(999);
    expect(resolved).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(resolved).toHaveBeenCalledTimes(1);
  });
});
