import '@testing-library/jest-dom';

// jsdom here exposes a `localStorage`/`sessionStorage` object whose methods are
// missing (`clear` is undefined), so any test that resets storage between cases
// throws "localStorage.clear is not a function". Install a minimal in-memory
// Storage only when the real one is unusable, so a future jsdom/vitest upgrade
// that ships a working implementation is left untouched.
if (typeof window !== 'undefined') {
  const installMemoryStorage = (key: 'localStorage' | 'sessionStorage') => {
    const existing = (window as unknown as Record<string, unknown>)[key] as
      | Partial<Storage>
      | undefined;
    if (existing && typeof existing.clear === 'function') return;

    const store = new Map<string, string>();
    const memoryStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (name: string) => (store.has(name) ? (store.get(name) as string) : null),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (name: string) => void store.delete(name),
      setItem: (name: string, value: string) => void store.set(name, String(value)),
    };

    Object.defineProperty(window, key, {
      configurable: true,
      writable: true,
      value: memoryStorage,
    });
  };

  installMemoryStorage('localStorage');
  installMemoryStorage('sessionStorage');
}

// jsdom doesn't implement matchMedia. Guarded so node-environment test files
// (e.g. API route contract tests) can share this setup.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
