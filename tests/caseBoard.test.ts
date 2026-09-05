import { describe, expect, it } from 'vitest';
import { GameState } from '@engine/GameState';
import { CaseBoardSystem } from '@engine/caseboard/CaseBoardSystem';
import type { CaseBoardConnectionDefinition } from '@engine/types';

const CONNECTIONS: CaseBoardConnectionDefinition[] = [
  {
    id: 'conn_presence',
    subjectId: 'gideon',
    category: 'presence',
    summaryText: 'Gideon admitted being at the relief.',
    placeholder: true
  },
  {
    id: 'conn_motive',
    subjectId: 'gideon',
    category: 'motive',
    summaryText: 'Gideon argued with Ashcombe about the Silent Lion.',
    unlockConditions: [{ type: 'fragment_collected', fragmentId: 'lion_sketch' }],
    placeholder: true
  },
  {
    id: 'conn_benedict',
    subjectId: 'benedict',
    category: 'concealment',
    summaryText: 'Benedict concealed the extent of his contact with Ashcombe.',
    unlockConditions: [{ type: 'flag', flag: 'benedict_confronted', equals: true }],
    placeholder: true
  }
];

function build() {
  const state = new GameState();
  const caseBoard = new CaseBoardSystem(state, CONNECTIONS);
  return { state, caseBoard };
}

describe('CaseBoardSystem', () => {
  it('shows a connection with no conditions immediately', () => {
    const { caseBoard } = build();
    const gideonConnections = caseBoard.getVisibleConnections('gideon');
    expect(gideonConnections.map((c) => c.id)).toEqual(['conn_presence']);
  });

  it('reveals a gated connection only once its condition is met', () => {
    const { state, caseBoard } = build();
    expect(caseBoard.getVisibleConnections('gideon')).toHaveLength(1);

    state.addFragment('lion_sketch');
    expect(caseBoard.getVisibleConnections('gideon').map((c) => c.id)).toEqual([
      'conn_presence',
      'conn_motive'
    ]);
  });

  it('only lists subjects with at least one visible connection', () => {
    const { caseBoard } = build();
    expect(caseBoard.getVisibleSubjectIds()).toEqual(['gideon']);
  });

  it('reveals benedict once his connection condition is met', () => {
    const { state, caseBoard } = build();
    expect(caseBoard.getVisibleSubjectIds()).not.toContain('benedict');

    state.setFlag('benedict_confronted', true);
    expect(caseBoard.getVisibleSubjectIds()).toContain('benedict');
    expect(caseBoard.getVisibleConnections('benedict')).toHaveLength(1);
  });

  it('getAllSubjectIds returns every subject regardless of visibility', () => {
    const { caseBoard } = build();
    expect(caseBoard.getAllSubjectIds()).toEqual(['gideon', 'benedict']);
  });
});
