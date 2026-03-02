import { useSyncExternalStore } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'activating';

let status: UpdateStatus = 'idle';
const listeners = new Set<() => void>();

export function setUpdateStatus(next: UpdateStatus) {
  if (status === next) return;
  status = next;
  for (const fn of listeners) fn();
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** React hook — subscribes to the module-level update status. */
export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(subscribe, getUpdateStatus);
}
