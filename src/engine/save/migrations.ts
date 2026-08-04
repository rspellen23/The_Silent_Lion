import { SAVE_SCHEMA_VERSION } from '../types';
import type { SaveGame } from '../types';

/**
 * Migration chain for save data written by older schema versions, so a
 * schema bump doesn't strand existing (even placeholder) save data — see
 * docs/engineering/adr/0004-save-system.md. Each entry migrates FROM the
 * keyed version to the next one; migrateSaveGame() walks the chain until
 * it reaches SAVE_SCHEMA_VERSION or hits a version with no migration.
 *
 * Historical schema shapes are intentionally typed loosely (not against
 * the current GameStateSnapshot) — they describe what used to be on disk,
 * not what the engine uses today.
 */

interface LegacySaveGameV1 {
  schemaVersion: 1;
  slotId: string;
  savedAtIso: string;
  sceneTitleAtSave: string;
  state: {
    currentSceneId: string;
    currentVisualStateIdByScene: Record<string, string>;
    activeConversationId: string | null;
    activeConversationLineId: string | null;
    flags: Record<string, boolean | string | number>;
    evidenceCollected: string[];
    journalProgress: Record<string, unknown>;
    deductionState: Record<string, unknown>;
    visitedSceneIds: string[];
    unlockedSceneIds: string[];
  };
  settings: unknown;
}

/**
 * v1 -> v2: "Evidence" renamed to "Fragment" (adr/0006), and fragments
 * gained a read/unread state that v1 had no concept of. Fragments already
 * collected under v1 are marked read on migration — the old UI never
 * distinguished read/unread, so this reproduces the old behavior (nothing
 * newly shows an "Unread" badge just because of the migration) rather
 * than surprising a returning player.
 */
function migrateV1ToV2(old: LegacySaveGameV1): SaveGame {
  const { evidenceCollected, ...restState } = old.state;
  return {
    ...old,
    schemaVersion: 2,
    state: {
      ...restState,
      fragmentsCollected: evidenceCollected,
      readFragmentIds: [...evidenceCollected]
    }
  } as SaveGame;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (old: any) => any> = {
  1: migrateV1ToV2
};

/**
 * Walks the migration chain from `raw.schemaVersion` up to
 * SAVE_SCHEMA_VERSION. Returns null if `raw` is malformed or if there is
 * no migration path from its version (a version too old, or newer than
 * this build knows about).
 */
export function migrateSaveGame(raw: unknown): SaveGame | null {
  if (!raw || typeof raw !== 'object' || typeof (raw as { schemaVersion?: unknown }).schemaVersion !== 'number') {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = raw;
  while (data.schemaVersion < SAVE_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[data.schemaVersion];
    if (!migrate) return null;
    data = migrate(data);
  }
  if (data.schemaVersion !== SAVE_SCHEMA_VERSION) return null;
  return data as SaveGame;
}
