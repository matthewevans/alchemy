import { beforeEach, describe, expect, it } from 'vitest';
import { usePreferencesStore } from './preferencesStore';
import { useTutorialStore } from './tutorialStore';

describe('tutorialStore', () => {
  beforeEach(() => {
    localStorage.clear();
    usePreferencesStore.setState({ tutorialEnabled: true });
    useTutorialStore.setState({
      currentTip: null,
      shownThisGame: new Set(),
      autoSeenSteps: new Set(),
    });
  });

  it('shows auto tip only once per concept', () => {
    const store = useTutorialStore.getState();
    store.showTip('first_energy', 'auto');
    expect(useTutorialStore.getState().currentTip?.id).toBe('first_energy');

    useTutorialStore.getState().dismissTip();
    useTutorialStore.getState().showTip('first_energy', 'auto');
    expect(useTutorialStore.getState().currentTip).toBeNull();
  });

  it('allows manual tips when auto tutorial is disabled', () => {
    usePreferencesStore.setState({ tutorialEnabled: false });
    const store = useTutorialStore.getState();

    store.showTip('first_play', 'auto');
    expect(useTutorialStore.getState().currentTip).toBeNull();

    store.showTip('first_play', 'manual');
    expect(useTutorialStore.getState().currentTip?.id).toBe('first_play');
  });
});
