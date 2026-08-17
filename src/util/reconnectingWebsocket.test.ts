// Forces this file to be treated as a module (not a global script) so its top-level declarations
// (`setup`, `FakeWebSocket`, ...) don't collide with same-named ones in other test files that also
// have no top-level import/export.
export {};

jest.mock('./logs', () => ({
  logDebug: jest.fn(),
  logDebugError: jest.fn(),
}));

const RECONNECT_MAX_ATTEMPTS = 8;
const RECONNECT_MAX_DELAY = 5000;
const RECONNECT_IDLE_DELAY = 30000;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;

  binaryType = '';

  onopen: (() => void) | undefined = undefined;

  onclose: ((event: unknown) => void) | undefined = undefined;

  onmessage: ((event: { data: unknown }) => void) | undefined = undefined;

  onerror: (() => void) | undefined = undefined;

  isClosed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(_data: string) {}

  close() {
    this.isClosed = true;
  }

  triggerClose(event: unknown = { code: 1006, reason: 'lost', wasClean: false }) {
    this.onclose?.(event);
  }

  triggerOpen() {
    this.onopen?.();
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data });
  }
}

function latestSocket() {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

/**
 * Every test gets a fully fresh module instance (via `jest.resetModules()` + `require`) rather than
 * sharing the top-level `import`. `focusAwareDelay.ts` holds module-level singleton state
 * (`isFocused`, the `focusListeners` set) that a `ReconnectingWebSocket` subscribes to for its whole
 * lifetime - reusing one module instance across tests risks a previous test's socket (even after
 * `close()`) leaving timers/subscriptions that interact with a later test in confusing ways. Fresh
 * modules per test sidestep that entirely instead of relying on every test perfectly tearing down.
 */
function setup() {
  jest.resetModules();
  FakeWebSocket.instances = [];
  (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const focusAwareDelay = require('./focusAwareDelay');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReconnectingWebSocket = require('./reconnectingWebsocket').default;

  const setIsAppFocused = focusAwareDelay.setIsAppFocused as (isFocused: boolean) => void;
  // Chase the module state to a known "unfocused" point so a later setIsAppFocused(true) is
  // guaranteed to actually fire (its setter no-ops on an unchanged value).
  setIsAppFocused(false);

  return {
    setIsAppFocused,
    ReconnectingWebSocket: ReconnectingWebSocket as new (url: string) => {
      isConnected: boolean;
      close(): void;
    },
  };
}

describe('ReconnectingWebSocket', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('never permanently gives up: keeps retrying at RECONNECT_IDLE_DELAY past the fast-retry budget', async () => {
    const { ReconnectingWebSocket } = setup();
    const socket = new ReconnectingWebSocket('wss://example.test');
    expect(FakeWebSocket.instances).toHaveLength(1);

    // Fail the entire fast-retry budget: each failure's delay is bounded by RECONNECT_MAX_DELAY.
    for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
      latestSocket().triggerClose();

      await jest.advanceTimersByTimeAsync(RECONNECT_MAX_DELAY);
    }
    expect(FakeWebSocket.instances.length).toBe(RECONNECT_MAX_ATTEMPTS + 1);

    // One more failure crosses past the budget - it must still schedule a retry (at the relaxed
    // idle pace), not disable auto-reconnect for good.
    latestSocket().triggerClose();
    let countBefore = FakeWebSocket.instances.length;
    await jest.advanceTimersByTimeAsync(RECONNECT_IDLE_DELAY);
    expect(FakeWebSocket.instances.length).toBe(countBefore + 1);

    // And it keeps retrying at that pace indefinitely, not just once.
    latestSocket().triggerClose();
    countBefore = FakeWebSocket.instances.length;
    await jest.advanceTimersByTimeAsync(RECONNECT_IDLE_DELAY);
    expect(FakeWebSocket.instances.length).toBe(countBefore + 1);

    socket.close();
  });

  it('retries immediately on app focus while disconnected, instead of waiting for the idle delay', async () => {
    const { ReconnectingWebSocket, setIsAppFocused } = setup();
    const socket = new ReconnectingWebSocket('wss://example.test');

    for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
      latestSocket().triggerClose();

      await jest.advanceTimersByTimeAsync(RECONNECT_MAX_DELAY);
    }
    // One more failure parks it in the RECONNECT_IDLE_DELAY wait.
    latestSocket().triggerClose();

    const countBeforeFocus = FakeWebSocket.instances.length;

    // Returning to the foreground must reconnect right away, with no timer advance needed.
    setIsAppFocused(true);
    expect(FakeWebSocket.instances.length).toBe(countBeforeFocus + 1);

    socket.close();
  });

  it(
    'resets the attempt counter on a focus-triggered reconnect (next failure uses a fast retry, not the idle delay)',
    async () => {
      const { ReconnectingWebSocket, setIsAppFocused } = setup();
      const socket = new ReconnectingWebSocket('wss://example.test');

      for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
        latestSocket().triggerClose();

        await jest.advanceTimersByTimeAsync(RECONNECT_MAX_DELAY);
      }
      latestSocket().triggerClose();

      setIsAppFocused(true);
      const countAfterFocusReconnect = FakeWebSocket.instances.length;

      // Fail once more; if the counter were NOT reset, this would schedule another RECONNECT_IDLE_DELAY
      // (30s) wait, and nothing would appear within RECONNECT_MAX_DELAY (5s).
      latestSocket().triggerClose();
      await jest.advanceTimersByTimeAsync(RECONNECT_MAX_DELAY);

      expect(FakeWebSocket.instances.length).toBe(countAfterFocusReconnect + 1);

      socket.close();
    });

  it('a focus event while already connected is a no-op', () => {
    const { ReconnectingWebSocket, setIsAppFocused } = setup();
    const socket = new ReconnectingWebSocket('wss://example.test');
    latestSocket().triggerOpen();
    expect(socket.isConnected).toBe(true);

    const countBeforeFocus = FakeWebSocket.instances.length;
    setIsAppFocused(true);

    expect(FakeWebSocket.instances.length).toBe(countBeforeFocus);

    socket.close();
  });

  it('close() stops all further reconnect attempts', async () => {
    const { ReconnectingWebSocket } = setup();
    const socket = new ReconnectingWebSocket('wss://example.test');
    latestSocket().triggerClose();

    socket.close();

    const countAtClose = FakeWebSocket.instances.length;
    await jest.advanceTimersByTimeAsync(RECONNECT_IDLE_DELAY + RECONNECT_MAX_DELAY);

    expect(FakeWebSocket.instances.length).toBe(countAtClose);
  });

  it('close() prevents a subsequent app-focus event from reconnecting', () => {
    const { ReconnectingWebSocket, setIsAppFocused } = setup();
    const socket = new ReconnectingWebSocket('wss://example.test');
    latestSocket().triggerClose();

    socket.close();
    const countAtClose = FakeWebSocket.instances.length;

    setIsAppFocused(true);

    expect(FakeWebSocket.instances.length).toBe(countAtClose);
  });
});
