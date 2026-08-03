import type { CharacterDefinition } from '../types';

/**
 * Resolves (characterId, expressionId) pairs to portrait asset IDs.
 * Holds no rendering logic — BackgroundManager's Phaser layer (or the
 * dialogue DOM UI) asks this for an asset ID and draws it.
 */
export class PortraitManager {
  private characters: Map<string, CharacterDefinition> = new Map();

  constructor(definitions: CharacterDefinition[]) {
    for (const def of definitions) {
      this.characters.set(def.id, def);
    }
  }

  getCharacter(characterId: string): CharacterDefinition | undefined {
    return this.characters.get(characterId);
  }

  resolvePortraitAssetId(characterId: string, expressionId?: string): string | null {
    const character = this.characters.get(characterId);
    if (!character) return null;
    const targetExpressionId = expressionId ?? character.defaultExpressionId;
    const expression =
      character.expressions.find((e) => e.id === targetExpressionId) ??
      character.expressions.find((e) => e.id === character.defaultExpressionId);
    return expression?.portraitAssetId ?? null;
  }

  isPlaceholder(characterId: string): boolean {
    return this.characters.get(characterId)?.placeholder ?? true;
  }
}
