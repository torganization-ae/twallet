import { DEFAULT_TIMEOUT } from '../config';
import { createCallbackManager } from './callbacks';
import { onAppFocus } from './focusAwareDelay';
import { logDebug, logDebugError } from './logs';
import { setCancellableTimeout } from './schedulers';

export type InMessageCallback<T> = (message: T) => void;
export type ConnectCallback = NoneToVoidFunction;
/** isUnexpected is false when the socket is closed manually, i.e. by calling close() */
export type DisconnectCallback = (isUnexpected: boolean) => void;

const RECONNECT_BASE_DELAY = 500;
const RECONNECT_MAX_DELAY = 5000;
/** After this many failed opens/closes without a healthy session, back off to `RECONNECT_IDLE_DELAY`. */
const RECONNECT_MAX_ATTEMPTS = 8;
/**
 * Retry pace once the fast attempts are exhausted. The socket must never stop retrying on its own: a backgrounded
 * mobile app burns through the fast attempts in well under a minute, and permanently disabling auto-reconnect left
 * the wallet with no live balance or activity updates until the app was restarted.
 */
const RECONNECT_IDLE_DELAY = 30000;

/**
 * Like WebSocket, but reconnects automatically when the socket disconnects
 */
export default class ReconnectingWebSocket<OutMessage, InMessage> {
  #url: string;

  #socket?: WebSocket;

  /** `true` between the `open` and the `close` events, i.e. when the socket can send and receive messages */
  #isConnected = false;

  /**
   * When `false`, unexpected closes and open timeouts do not schedule another connect.
   * `close()` turns this off; `reconnect()` turns it back on.
   */
  #autoReconnect = true;

  #reconnectAttemptCount = 0;

  /** Cancels setTimeout of the WebSocket open timeout and the reconnect delay (they never happen simultaneously) */
  #cancelTimeout?: NoneToVoidFunction;

  #outMessageQueue: OutMessage[] = [];

  #inMessageListeners = createCallbackManager<InMessageCallback<InMessage>>();

  #connectListeners = createCallbackManager<ConnectCallback>();

  #disconnectListeners = createCallbackManager<DisconnectCallback>();

  #unsubscribeAppFocus: NoneToVoidFunction;

  constructor(url: string | URL) {
    this.#url = url.toString();
    this.#unsubscribeAppFocus = onAppFocus(this.#handleAppFocus);
    this.#startSocket();
  }

  /**
   * Sends a message via the socket.
   * If the socket is disconnected, stashes the message until the socket is connected.
   */
  public send(message: OutMessage) {
    if (this.#socket && this.#isConnected) {
      this.#sendMessageNow(message);
    } else {
      this.#outMessageQueue.push(message);
    }
  }

  /**
   * Returns `true` is the socket is connected now. You may send messages regardless of the connection status.
   * The objects always initializes in the disconnected state.
   */
  public get isConnected() {
    return this.#isConnected;
  }

  /** Closes the current socket connection and creates a new one. Call it when you suspect the socket has hung. */
  public reconnect() {
    this.#autoReconnect = true;
    // `close()` unsubscribes; re-arm so a reopened socket keeps recovering on foreground.
    this.#unsubscribeAppFocus = onAppFocus(this.#handleAppFocus);
    this.#stopSocket();

    if (this.#isConnected) {
      this.#isConnected = false;
      this.#disconnectListeners.runCallbacks(false);
    }

    this.#startSocket();
  }

  /** Registers a callback firing when a message arrives from the socket */
  public onMessage(callback: InMessageCallback<InMessage>) {
    return this.#inMessageListeners.addCallback(callback);
  }

  /**
   * Registers a callback firing when the socket is connected initially or reconnected.
   * I.e. when isConnected switches from `false` to `true`.
   */
  public onConnect(callback: ConnectCallback) {
    return this.#connectListeners.addCallback(callback);
  }

  /**
   * Registers a callback firing when the socket is disconnected.
   * I.e. when isConnected switches from `true` to `false`.
   */
  public onDisconnect(callback: DisconnectCallback) {
    return this.#disconnectListeners.addCallback(callback);
  }

  /**
   * Call it when you don't need the socket anymore.
   * Stops auto-reconnect; the callbacks won't fire after that except the final disconnect (if connected).
   */
  public close() {
    this.#autoReconnect = false;
    this.#unsubscribeAppFocus();
    this.#stopSocket();

    if (this.#isConnected) {
      this.#isConnected = false;
      this.#disconnectListeners.runCallbacks(false);
    }
  }

  #startSocket() {
    this.#stopSocket();

    this.#socket = new WebSocket(this.#url);
    this.#socket.binaryType = 'arraybuffer';

    this.#socket.onerror = () => logDebugError('WebSocket error event', this.#url);
    this.#socket.onopen = this.#handleSocketOpen;
    this.#socket.onclose = this.#handleSocketClose;
    this.#socket.onmessage = this.#handleSocketMessage;

    // If the socket doesn't open in several seconds, retry opening it
    this.#cancelTimeout = setCancellableTimeout(DEFAULT_TIMEOUT, () => this.#handleSocketClose('openTimeout'));
  }

  #stopSocket() {
    this.#cancelTimeout?.();

    if (!this.#socket) {
      return;
    }

    this.#socket.onerror = null; // eslint-disable-line no-null/no-null
    this.#socket.onopen = null; // eslint-disable-line no-null/no-null
    this.#socket.onclose = null; // eslint-disable-line no-null/no-null
    this.#socket.onmessage = null; // eslint-disable-line no-null/no-null
    this.#socket.close();

    this.#socket = undefined;
  }

  #sendMessageNow(message: OutMessage) {
    if (!this.#socket) throw new Error('No active socket');
    this.#socket.send(JSON.stringify(message));
  }

  #handleSocketOpen = () => {
    logDebug('WebSocket opened', this.#url);

    this.#cancelTimeout?.();
    // Do not reset `#reconnectAttemptCount` here: open→instant-close flaps
    // (no useful server message) must keep growing the delay. Reset happens on
    // the first inbound message via `#handleSocketMessage`.

    while (this.#outMessageQueue.length) {
      this.#sendMessageNow(this.#outMessageQueue.shift()!);
    }

    if (!this.#isConnected) {
      this.#isConnected = true;
      this.#connectListeners.runCallbacks();
    }
  };

  #handleSocketClose = (event: CloseEvent | 'openTimeout') => {
    if (event === 'openTimeout') {
      logDebugError('WebSocket open timeout');
    } else {
      logDebugError('WebSocket closed unexpectedly', event.code, event.reason, event.wasClean);
    }

    this.#stopSocket();

    if (this.#isConnected) {
      if (event === 'openTimeout') {
        throw new Error('Unexpected timeout event in an open socket');
      }

      this.#isConnected = false;
      this.#disconnectListeners.runCallbacks(true);
    }

    if (!this.#autoReconnect) {
      return;
    }

    this.#reconnectAttemptCount++;

    // Past the fast-retry budget, keep trying at a relaxed pace instead of shutting auto-reconnect off for good.
    // `#handleAppFocus` additionally short-circuits the wait as soon as the user comes back to the app.
    const reconnectDelay = this.#reconnectAttemptCount > RECONNECT_MAX_ATTEMPTS
      ? RECONNECT_IDLE_DELAY
      : Math.min(
        (RECONNECT_BASE_DELAY + (2000 * Math.random())) * this.#reconnectAttemptCount,
        RECONNECT_MAX_DELAY,
      );

    this.#cancelTimeout = setCancellableTimeout(reconnectDelay, () => this.#startSocket());
  };

  /**
   * A socket dropped while the app was backgrounded may sit in the long idle retry window. Returning to the
   * foreground is the moment the user expects fresh data, so retry immediately with a fresh attempt budget.
   */
  #handleAppFocus = () => {
    if (!this.#autoReconnect || this.#isConnected) {
      return;
    }

    this.#reconnectAttemptCount = 0;
    this.#startSocket();
  };

  #handleSocketMessage = ({ data }: MessageEvent<string | ArrayBuffer>) => {
    // Any server frame means the link was actually usable (even an error frame).
    this.#reconnectAttemptCount = 0;
    this.#inMessageListeners.runCallbacks(
      data instanceof ArrayBuffer
        ? data as InMessage
        : JSON.parse(data),
    );
  };
}
