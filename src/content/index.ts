import type {
  CharacterDefinition,
  ConversationDefinition,
  DeductionDefinition,
  EvidenceDefinition,
  JournalEntryDefinition,
  SceneDefinition
} from '@engine/types';
import type { PlaceholderTextureSpec } from '@engine/placeholder/PlaceholderTextureFactory';

import charactersJson from './characters.json';
import scenesJson from './scenes.json';
import evidenceJson from './evidence.json';
import journalEntriesJson from './journalEntries.json';
import deductionsJson from './deductions.json';
import placeholderAssetsJson from './placeholderAssets.json';
import convTestIntroJson from './dialogue/conv_test_intro.json';

/**
 * Single load point for all story/content data. Adding a new scene,
 * conversation, or evidence item to the vertical slice (or, later, real
 * content) means editing JSON here — never engine code.
 */
export const characters = charactersJson as CharacterDefinition[];
export const scenes = scenesJson as SceneDefinition[];
export const evidenceDefinitions = evidenceJson as EvidenceDefinition[];
export const journalEntries = journalEntriesJson as JournalEntryDefinition[];
export const deductions = deductionsJson as DeductionDefinition[];
export const placeholderAssetSpecs = placeholderAssetsJson as PlaceholderTextureSpec[];
export const conversations = [convTestIntroJson] as ConversationDefinition[];
