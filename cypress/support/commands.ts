interface CypressWindow extends Window {
  __gameStore?: {
    getState: () => {
      state: {
        phase: { type: string };
        turn: number;
        activePlayer: string;
        players: Record<string, {
          health: number;
          maxEnergy: number;
          currentEnergy: number;
          hand: unknown[];
          board: unknown[];
        }>;
      };
      humanPlayer: string;
      legalActions: Array<{ type: string; cardIndex?: number; targetSlot?: number; permanentId?: string }>;
      dispatch: (action: { type: string; [k: string]: unknown }, player: string) => unknown;
    };
  };
  __animationStore?: { getState: () => { isAnimating: boolean } };
  __uiStore?: { getState: () => { showTurnBanner: boolean } };
}

// ─── Game Setup ───

Cypress.Commands.add('startGame', (seed: number, deckElement: string) => {
  cy.visit(`/?seed=${seed}`);
  cy.get('[data-testid="play-btn"]').click();
  cy.get(`[data-testid="deck-option-${deckElement}"]`).first().click();
});

Cypress.Commands.add('keepHand', () => {
  cy.get('[data-testid="keep-hand-btn"]').click();
});

Cypress.Commands.add('waitForAnimations', () => {
  cy.window().then((win) => {
    const typedWin = win as CypressWindow;
    const animStore = typedWin.__animationStore;
    const uiStore = typedWin.__uiStore;
    if (!animStore) return;

    return new Cypress.Promise((resolve) => {
      const check = () => {
        const animating = animStore.getState().isAnimating;
        const banner = uiStore?.getState().showTurnBanner ?? false;
        if (!animating && !banner) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  });
});

// ─── Card Actions ───

Cypress.Commands.add('clickHandCard', (index: number) => {
  cy.get(`[data-testid="hand-card-${index}"]`).click({ force: true });
});

Cypress.Commands.add('clickBoardSlot', (slotIndex: number) => {
  cy.get(`[data-slot-index="${slotIndex}"][data-board-player="player1"]`).first().click();
});

Cypress.Commands.add('clickBoardCreature', (permanentId: string) => {
  cy.get(`[data-testid="board-card-${permanentId}"]`).click();
});

/**
 * Play a card directly via the game store dispatch.
 * More reliable than clicking UI elements since card layout can obscure click targets.
 */
Cypress.Commands.add('dispatchPlayCard', (cardIndex: number, targetSlot?: number) => {
  cy.window().then((win) => {
    const store = (win as CypressWindow).__gameStore;
    const { humanPlayer } = store!.getState();
    const action: Record<string, unknown> = { type: 'PLAY_CARD', cardIndex };
    if (targetSlot !== undefined) action.targetSlot = targetSlot;
    store!.getState().dispatch(action, humanPlayer);
  });
  cy.waitForAnimations();
});

// ─── Combat ───

Cypress.Commands.add('allAttack', () => {
  cy.get('[data-testid="all-attack-btn"]').click();
});

Cypress.Commands.add('skipAttack', () => {
  cy.get('[data-testid="skip-attack-btn"]').click();
});

Cypress.Commands.add('confirmBlockers', () => {
  cy.get('[data-testid="blocker-controls"]').find('button').click();
});

// ─── Phase Advancement ───

Cypress.Commands.add('advanceToBattle', () => {
  cy.contains('button', 'Battle!').click();
  cy.waitForAnimations();
});

Cypress.Commands.add('endTurn', () => {
  cy.contains('button', 'End Turn').click();
  cy.waitForAnimations();
});

// ─── Store Access ───

Cypress.Commands.add('getGameState', () => {
  return cy.window().then((win) => {
    const store = (win as CypressWindow).__gameStore;
    return store!.getState();
  });
});

/**
 * Wait until it's the human player's turn and in the specified phase.
 * This avoids false matches on the opponent's turn.
 */
Cypress.Commands.add('waitForHumanPhase', (phaseType: string) => {
  cy.window({ timeout: 15000 }).then((win) => {
    const store = (win as CypressWindow).__gameStore;
    if (!store) throw new Error('Game store not found');

    return new Cypress.Promise((resolve) => {
      const check = () => {
        const { state, humanPlayer } = store.getState();
        if (
          state &&
          state.activePlayer === humanPlayer &&
          state.phase.type === phaseType
        ) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  });
});

// ─── Assertions ───

Cypress.Commands.add('assertHealth', (player: 'player1' | 'player2', hp: number) => {
  cy.get(`[data-testid="health-${player}"]`).should('contain.text', String(hp));
});

Cypress.Commands.add('assertBoardCount', (player: 'player1' | 'player2', n: number) => {
  cy.window().then((win) => {
    const store = (win as CypressWindow).__gameStore;
    const state = store!.getState().state;
    const creatures = state.players[player].board.filter(Boolean);
    expect(creatures).to.have.length(n);
  });
});

Cypress.Commands.add('waitForPhase', (phaseType: string) => {
  cy.get('[data-testid="phase-strip"]', { timeout: 10000 })
    .should('have.attr', 'data-phase', phaseType);
});

Cypress.Commands.add('assertNoGameOver', () => {
  cy.get('[data-testid="victory-screen"]').should('not.exist');
  cy.get('[data-testid="defeat-screen"]').should('not.exist');
});

// ─── Type Declarations ───

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      startGame(seed: number, deckElement: string): Chainable<void>;
      keepHand(): Chainable<void>;
      waitForAnimations(): Chainable<void>;
      clickHandCard(index: number): Chainable<void>;
      clickBoardSlot(slotIndex: number): Chainable<void>;
      clickBoardCreature(permanentId: string): Chainable<void>;
      dispatchPlayCard(cardIndex: number, targetSlot?: number): Chainable<void>;
      allAttack(): Chainable<void>;
      skipAttack(): Chainable<void>;
      confirmBlockers(): Chainable<void>;
      advanceToBattle(): Chainable<void>;
      endTurn(): Chainable<void>;
      getGameState(): Chainable<{
        state: {
          phase: { type: string };
          turn: number;
          activePlayer: string;
          players: Record<string, {
            health: number;
            maxEnergy: number;
            currentEnergy: number;
            hand: unknown[];
            board: unknown[];
          }>;
        };
        humanPlayer: string;
        legalActions: Array<{ type: string; cardIndex?: number; targetSlot?: number; permanentId?: string }>;
      }>;
      waitForHumanPhase(phaseType: string): Chainable<void>;
      assertHealth(player: 'player1' | 'player2', hp: number): Chainable<void>;
      assertBoardCount(player: 'player1' | 'player2', n: number): Chainable<void>;
      waitForPhase(phaseType: string): Chainable<void>;
      assertNoGameOver(): Chainable<void>;
    }
  }
}
