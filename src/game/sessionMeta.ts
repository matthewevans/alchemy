export type MatchModifiers = Record<string, never>;

export interface QuickplaySessionMeta {
  mode: 'quickplay';
}

export interface AdventureSessionMeta {
  mode: 'adventure';
  profileId: string;
  nodeId: string;
  zoneId: string;
  matchModifiers?: MatchModifiers;
}

export interface MultiplayerSessionMeta {
  mode: 'multiplayer';
}

export type GameSessionMeta =
  | QuickplaySessionMeta
  | AdventureSessionMeta
  | MultiplayerSessionMeta;
