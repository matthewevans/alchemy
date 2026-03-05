import type { LearningProfile } from '../domain/masteryModel';

const PROFILE_SCHEMA_VERSION = 1 as const;
const PROFILE_KEY_PREFIX = 'alchemy:learning-profile:';

interface PersistedLearningProfile {
  version: number;
  profile: LearningProfile;
}

export interface LearningProfileRepository {
  load(profileId: string): Promise<LearningProfile | null>;
  save(profileId: string, profile: LearningProfile): Promise<void>;
}

function storageKey(profileId: string): string {
  return `${PROFILE_KEY_PREFIX}${profileId}`;
}

function migratePersistedProfile(raw: unknown): LearningProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  const parsed = raw as Partial<PersistedLearningProfile>;
  if (parsed.version !== PROFILE_SCHEMA_VERSION) return null;
  if (!parsed.profile || typeof parsed.profile !== 'object') return null;

  const profile = parsed.profile as LearningProfile;
  if (profile.version !== PROFILE_SCHEMA_VERSION) return null;
  if (!profile.reading || !profile.math) return null;

  return profile;
}

export class LocalLearningProfileRepository implements LearningProfileRepository {
  async load(profileId: string): Promise<LearningProfile | null> {
    try {
      const raw = localStorage.getItem(storageKey(profileId));
      if (!raw) return null;
      return migratePersistedProfile(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(profileId: string, profile: LearningProfile): Promise<void> {
    const payload: PersistedLearningProfile = {
      version: PROFILE_SCHEMA_VERSION,
      profile,
    };
    localStorage.setItem(storageKey(profileId), JSON.stringify(payload));
  }
}
