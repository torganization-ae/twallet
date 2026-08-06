declare module 'minimatch' {
  export class Minimatch {
    constructor(pattern: string, options?: Record<string, unknown>);
    match(path: string): boolean;
  }
}
