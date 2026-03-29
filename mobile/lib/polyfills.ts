// Polyfill WeakRef for environments where it may not be available
if (typeof globalThis.WeakRef === 'undefined') {
  // Minimal WeakRef polyfill — holds a strong reference as fallback
  (globalThis as any).WeakRef = class WeakRefPolyfill<T extends object> {
    private _target: T | undefined;
    constructor(target: T) {
      this._target = target;
    }
    deref(): T | undefined {
      return this._target;
    }
  };
}
