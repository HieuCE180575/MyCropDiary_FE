import { getAccessToken } from '../../features/auth/authStorage';

export interface RealtimeChangeEvent {
  timestamp: number;
  path?: string;
  method?: string;
  source?: 'local' | 'broadcast' | 'storage' | 'server' | 'focus';
}

export type RealtimeListener = (event: RealtimeChangeEvent) => void;

const CHANNEL_NAME = 'mycropdiary_realtime_sync_v1';
const STORAGE_KEY = 'mycropdiary_realtime_ping_v1';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1').replace(/\/$/, '');

const listeners = new Set<RealtimeListener>();
let broadcastChannel: BroadcastChannel | null = null;
let initialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastServerVersion: number | null = null;

export function isJsdomTestEnv(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof window.addEventListener !== 'function' ||
    typeof document.addEventListener !== 'function'
  ) {
    return true;
  }
  if (typeof navigator === 'undefined' || /jsdom|node/i.test(navigator.userAgent || '')) return true;
  return false;
}

function emitToListeners(event: RealtimeChangeEvent) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Ignore individual listener errors so other components still sync
      }
    });
  }, 200);
}

async function checkServerVersion() {
  if (isJsdomTestEnv()) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (listeners.size === 0) return;

  const token = getAccessToken();
  if (!token) return;

  try {
    const res = await window.fetch(`${API_BASE_URL}/realtime/version`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      success?: boolean;
      data?: { version?: number; lastPath?: string };
    };
    const serverVer = json?.data?.version;
    if (typeof serverVer === 'number') {
      if (lastServerVersion !== null && serverVer !== lastServerVersion) {
        lastServerVersion = serverVer;
        emitToListeners({
          timestamp: Date.now(),
          path: json?.data?.lastPath,
          source: 'server',
        });
      } else {
        lastServerVersion = serverVer;
      }
    }
  } catch {
    // Ignore transient network errors during silent background check
  }
}

export function initRealtimeInfrastructure() {
  if (initialized || typeof window === 'undefined' || isJsdomTestEnv()) return;
  initialized = true;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (msg: MessageEvent<RealtimeChangeEvent>) => {
        if (msg?.data) {
          emitToListeners({ ...msg.data, source: 'broadcast' });
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }

  window.addEventListener('mycropdiary:data-changed', () => {
    notifyDataChanged();
  });

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as RealtimeChangeEvent;
        emitToListeners({ ...parsed, source: 'storage' });
      } catch {
        emitToListeners({ timestamp: Date.now(), source: 'storage' });
      }
    }
  });

  window.addEventListener('focus', () => {
    void checkServerVersion();
    emitToListeners({ timestamp: Date.now(), source: 'focus' });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkServerVersion();
      emitToListeners({ timestamp: Date.now(), source: 'focus' });
    }
  });

  setInterval(() => {
    void checkServerVersion();
  }, 3500);
}

export function subscribeRealtime(listener: RealtimeListener): () => void {
  if (isJsdomTestEnv()) return () => {};
  initRealtimeInfrastructure();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDataChanged(path?: string, method?: string) {
  if (isJsdomTestEnv()) return;
  initRealtimeInfrastructure();

  if (path && /^\/?auth\b/i.test(path)) return;

  const event: RealtimeChangeEvent = {
    timestamp: Date.now(),
    path,
    method,
    source: 'local',
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch {
      // ignore
    }
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch {
    // ignore storage quota errors
  }

  emitToListeners(event);
}
