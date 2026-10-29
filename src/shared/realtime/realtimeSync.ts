import { useEffect, useRef } from 'react';
import {
  subscribeRealtime,
  notifyDataChanged,
  type RealtimeChangeEvent,
} from './realtimeBus';

export { notifyDataChanged, type RealtimeChangeEvent };

/**
 * React hook for silent background realtime synchronization.
 * Automatically invokes `onSync` in the background when any role modifies data.
 */
export function useRealtimeSync(onSync: (event: RealtimeChangeEvent) => void) {
  const callbackRef = useRef(onSync);
  callbackRef.current = onSync;

  useEffect(() => {
    return subscribeRealtime((event) => {
      callbackRef.current(event);
    });
  }, []);
}
