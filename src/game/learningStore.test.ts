import { beforeEach, describe, expect, it } from 'vitest';
import { useLearningStore } from './learningStore';

describe('learningStore', () => {
  beforeEach(() => {
    useLearningStore.getState().reset();
  });

  it('tracks opportunities in local session when gameId is null', () => {
    const store = useLearningStore.getState();
    expect(store.consumeOpportunity(null)).toBe(1);
    expect(useLearningStore.getState().consumeOpportunity(null)).toBe(2);
    expect(useLearningStore.getState().consumeOpportunity(null)).toBe(3);
  });

  it('resets counter when game session changes', () => {
    const store = useLearningStore.getState();
    expect(store.consumeOpportunity('g1')).toBe(1);
    expect(useLearningStore.getState().consumeOpportunity('g1')).toBe(2);
    expect(useLearningStore.getState().consumeOpportunity('g2')).toBe(1);
    expect(useLearningStore.getState().consumeOpportunity('g2')).toBe(2);
    expect(useLearningStore.getState().consumeOpportunity(null)).toBe(1);
  });
});

