/*
Dev settings can be activated from the browser console,
either in the main frame or in the worker (different commands for different frames).
*/

declare const self: (WorkerGlobalScope | Window) & {
  devSettings: Record<string, unknown>;
};

export function getDevSettings() {
  return self.devSettings ?? {};
}

self.devSettings = {};
