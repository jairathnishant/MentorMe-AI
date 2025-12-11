import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock SpeechSynthesis
const speechMock = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([]),
};
Object.defineProperty(window, 'speechSynthesis', {
  value: speechMock,
});
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: vi.fn(),
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock IndexedDB (simulate async onsuccess behavior)
const indexedDBMock = {
  open: vi.fn().mockImplementation(() => {
    const result = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn().mockImplementation(() => {
            const r: any = {};
            // simulate async success
            setTimeout(() => r.onsuccess && r.onsuccess(), 0);
            return r;
          }),
          get: vi.fn().mockImplementation(() => {
            const r: any = {};
            setTimeout(() => r.onsuccess && r.onsuccess(), 0);
            return r;
          }),
          delete: vi.fn().mockImplementation(() => {
            const r: any = {};
            setTimeout(() => r.onsuccess && r.onsuccess(), 0);
            return r;
          }),
        }),
      }),
    };

    const req: any = {
      result,
      onerror: null,
      onupgradeneeded: null,
    };

    // When callers set request.onsuccess, invoke that function asynchronously
    Object.defineProperty(req, 'onsuccess', {
      set(fn: any) {
        setTimeout(() => fn && fn(), 0);
      },
    });

    return req;
  }),
};
Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
});

// Mock LocalStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function(key: string) {
      delete store[key];
    },
    clear: function() {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});