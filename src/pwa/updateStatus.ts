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

// --- Download progress (0–100) ---

let downloadProgress = 0;
const progressListeners = new Set<() => void>();

export function setDownloadProgress(value: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  if (downloadProgress === clamped) return;
  downloadProgress = clamped;
  for (const fn of progressListeners) fn();
}

export function getDownloadProgress(): number {
  return downloadProgress;
}

function subscribeProgress(callback: () => void): () => void {
  progressListeners.add(callback);
  return () => progressListeners.delete(callback);
}

/** React hook — subscribes to the simulated download progress (0–100). */
export function useDownloadProgress(): number {
  return useSyncExternalStore(subscribeProgress, getDownloadProgress);
}
