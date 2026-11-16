// Standard browser storage provider for Supabase authentication
const memoryStorage: Record<string, string> = {};

const fallbackStorage = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
  },
};

export function brokeredPreviewStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore security / sandbox errors
  }
  return fallbackStorage;
}

