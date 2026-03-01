import type { PeerSession } from './peer';

/** Module-level handoff for PeerSession between pages (can't pass functions through history.pushState). */
let pendingSession: PeerSession | null = null;

export function setPendingSession(session: PeerSession): void {
  pendingSession = session;
}

export function takePendingSession(): PeerSession | null {
  const session = pendingSession;
  pendingSession = null;
  return session;
}
