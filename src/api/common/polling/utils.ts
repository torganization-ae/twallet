import type { FallbackPollingOptions } from './fallbackPollingScheduler';

import Deferred from '../../../util/Deferred';
import { focusAwareDelay, onFocusAwareDelay } from '../../../util/focusAwareDelay';
import { setCancellableTimeout, throttle } from '../../../util/schedulers';
import { MINUTE, SEC } from '../../constants';

export type Period = number | {
  focused: number;
  notFocused: number;
};

export const activeWalletTiming: FallbackPollingOptions = {
  pollOnStart: true,
  minPollDelay: { focused: 20 * SEC, notFocused: MINUTE },
  pollingStartDelay: 15 * SEC,
  // Public providers (toncenter / publicnode / …) rate-limit hard. HTTP fallback
  // at most once a minute while focused; live sockets push interim changes.
  pollingPeriod: { focused: MINUTE, notFocused: 3 * MINUTE },
  forcedPollingPeriod: { focused: 10 * MINUTE, notFocused: 20 * MINUTE },
};

export const inactiveWalletTiming: FallbackPollingOptions = {
  pollOnStart: false,
  minPollDelay: { focused: 30 * SEC, notFocused: 2 * MINUTE },
  pollingStartDelay: 30 * SEC,
  pollingPeriod: { focused: 3 * MINUTE, notFocused: 10 * MINUTE },
  forcedPollingPeriod: { focused: 15 * MINUTE, notFocused: 30 * MINUTE },
};

export const activeNftTiming: FallbackPollingOptions = {
  pollOnStart: true,
  minPollDelay: { focused: 15 * SEC, notFocused: MINUTE },
  pollingStartDelay: 0,
  // Full NFT rescans only while the Collectibles tab is open.
  pollingPeriod: { focused: 2 * MINUTE, notFocused: 10 * MINUTE },
  forcedPollingPeriod: { focused: 10 * MINUTE, notFocused: 30 * MINUTE },
};

export const inactiveNftTiming: FallbackPollingOptions = {
  pollOnStart: false,
  minPollDelay: { focused: 30 * SEC, notFocused: 2 * MINUTE },
  pollingStartDelay: 30 * SEC,
  pollingPeriod: { focused: 5 * MINUTE, notFocused: 15 * MINUTE },
  forcedPollingPeriod: { focused: 30 * MINUTE, notFocused: 60 * MINUTE },
};

interface PollingLoopOptions<Dep> {
  period: Period;
  /** The minimum time between the `poll` calls */
  minDelay?: Period;
  /** If `true`, `poll` won't be called at the loop start */
  skipInitialPoll?: boolean;
  /** Called before any `poll` call */
  prepare?: () => Promise<Dep>;
  /** Called periodically. Never executed in parallel. If returns 'stop', the polling stops. */
  poll: (dependency: Dep) => MaybePromise<void | 'stop'>;
}

/**
 * Executes the given functions indefinitely with pauses.
 * An execution can be triggered manually, in which case the scheduled execution will be delayed.
 */
export function pollingLoop<Dep>({
  period,
  minDelay = 0,
  skipInitialPoll,
  prepare = () => Promise.resolve() as Promise<Dep>,
  poll,
}: PollingLoopOptions<Dep>) {
  let isStopped = false;
  let cancelPause: NoneToVoidFunction | undefined;
  const dependenciesDeferred = new Deferred<Dep>();

  // Using `throttle` to avoid parallel execution
  const iteration = throttle(async () => {
    if (isStopped) {
      return;
    }

    cancelPause?.();
    const dependencies = await dependenciesDeferred.promise;

    try {
      const response = await poll(dependencies);
      if (response === 'stop') {
        isStopped = true;
      }
    } finally {
      if (!isStopped) {
        scheduleIteration();
      }
    }
  }, () => {
    return focusAwareDelay(...periodToMs(minDelay));
  });

  function scheduleIteration() {
    cancelPause?.();
    cancelPause = onFocusAwareDelay(...periodToMs(period), iteration);
  }

  void prepare().then((dependencies) => {
    if (isStopped) {
      return;
    }

    dependenciesDeferred.resolve(dependencies);

    if (skipInitialPoll) {
      scheduleIteration();
    } else {
      iteration();
    }
  });

  return {
    poll: iteration,
    stop() {
      isStopped = true;
      cancelPause?.();
    },
  };
}

/**
 * Wraps the given `action` function. When the wrapped function is executed, it executes `action` immediately, and
 * several times after that. The number of additional executions is equal to `pauses.length`. Each number in `pauses` is
 * the pause (in milliseconds) between the `action` executions. When the wrapped function is executed, the previously
 * scheduled additional executions are cancelled.
 *
 * `attemptNumber` starts from 0 and increments with each additional execution.
 */
export function withDoubleCheck<Args extends unknown[], Result>(
  pauses: number[],
  action: (attemptNumber: number, ...args: Args) => MaybePromise<Result>,
) {
  let isStopped = false;
  let cancelDoubleCheck: NoneToVoidFunction | undefined;

  async function makeAttempt(attemptNumber: number, args: Args) {
    cancelDoubleCheck?.();

    try {
      return await action(attemptNumber, ...args);
    } finally {
      if (!isStopped && attemptNumber < pauses.length) {
        cancelDoubleCheck?.(); // Cancelling again due to possible race conditions
        cancelDoubleCheck = setCancellableTimeout(
          pauses[attemptNumber],
          () => makeAttempt(attemptNumber + 1, args),
        );
      }
    }
  }

  return {
    /** Executes `actions` and returns the result of the first execution */
    run(...args: Args) {
      isStopped = false;
      return makeAttempt(0, args);
    },
    /** Cancels the scheduled additional executions */
    cancel() {
      isStopped = true;
      cancelDoubleCheck?.();
    },
  };
}

export function periodToMs(period: Period): [ms: number, forceMs: number] {
  if (typeof period === 'number') {
    return [period, period];
  }

  const { focused, notFocused } = period;
  return [focused, notFocused];
}
