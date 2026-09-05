import type {
  CaseBoardConnectionDefinition,
  CharacterDefinition,
  ConversationDefinition,
  DeductionDefinition,
  FragmentDefinition,
  GameConfig,
  InterpretationPromptDefinition,
  JournalEntryDefinition,
  SceneDefinition
} from '@engine/types';
import type { PlaceholderTextureSpec } from '@engine/placeholder/PlaceholderTextureFactory';

/**
 * Single load point for all story/content data. Scenes and conversations
 * are auto-loaded one-file-per-scene/conversation via import.meta.glob —
 * adding a new file under scenes/ or dialogue/ is enough by itself, no
 * edits needed here (see docs/engineering/adr/0008-content-auto-loading.md).
 * Catalog-shaped content (fragments, journal entries, deductions,
 * characters) stays in single flat files for now.
 */

const sceneModules = import.meta.glob('./scenes/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, SceneDefinition>;

const dialogueModules = import.meta.glob('./dialogue/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, ConversationDefinition>;

export const scenes: SceneDefinition[] = Object.values(sceneModules);
export const conversations: ConversationDefinition[] = Object.values(dialogueModules);

import charactersJson from './characters.json';
import fragmentsJson from './fragments.json';
import journalEntriesJson from './journalEntries.json';
import deductionsJson from './deductions.json';
import interpretationPromptsJson from './interpretationPrompts.json';
import caseBoardConnectionsJson from './caseBoardConnections.json';
import placeholderAssetsJson from './placeholderAssets.json';
import gameConfigJson from './gameConfig.json';

export const characters = charactersJson as CharacterDefinition[];
export const fragmentDefinitions = fragmentsJson as FragmentDefinition[];
export const journalEntries = journalEntriesJson as JournalEntryDefinition[];
export const deductions = deductionsJson as DeductionDefinition[];
export const interpretationPrompts = interpretationPromptsJson as InterpretationPromptDefinition[];
export const caseBoardConnections = caseBoardConnectionsJson as CaseBoardConnectionDefinition[];
export const placeholderAssetSpecs = placeholderAssetsJson as PlaceholderTextureSpec[];
export const gameConfig = gameConfigJson as GameConfig;
