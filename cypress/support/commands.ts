interface CypressWindow extends Window {
  __gameStore?: { getState: () => {
    state: { players: Record<string, { board: unknown[] }> };
    legalActions: Array<{ type: string; cardIndex?: number; targetSlot?: number }>;
  }};
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
  cy.get(`[data-testid="hand-card-${index}"]`).click();
});

Cypress.Commands.add('clickBoardSlot', (slotIndex: number) => {
  cy.get(`[data-slot-index="${slotIndex}"][data-board-player="player1"]`).first().click();
});

Cypress.Commands.add('clickBoardCreature', (permanentId: string) => {
  cy.get(`[data-testid="board-card-${permanentId}"]`).click();
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
      allAttack(): Chainable<void>;
      skipAttack(): Chainable<void>;
      confirmBlockers(): Chainable<void>;
      assertHealth(player: 'player1' | 'player2', hp: number): Chainable<void>;
      assertBoardCount(player: 'player1' | 'player2', n: number): Chainable<void>;
      waitForPhase(phaseType: string): Chainable<void>;
    }
  }
}
