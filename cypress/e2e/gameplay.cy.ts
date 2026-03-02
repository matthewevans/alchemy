/**
 * General gameplay E2E tests.
 * Uses deterministic seeds to exercise multi-turn flows, combat, and energy management.
 */

function dismissTipsIfPresent() {
  cy.get('body').then(($body) => {
    if ($body.find('button:contains("Got it")').length) {
      cy.contains('button', 'Got it').click();
    }
  });
}

/** Pass the human player's turn and wait for the next human play phase. */
function passTurn() {
  cy.advanceToBattle();
  cy.skipAttack();
  cy.waitForAnimations();
  cy.endTurn();
  cy.waitForAnimations();
  cy.waitForHumanPhase('play');
  cy.waitForAnimations();
}

describe('Gameplay — multi-turn flow (seed 42, fire)', () => {
  beforeEach(() => {
    cy.startGame(42, 'fire');
    cy.keepHand();
    cy.waitForAnimations();
    dismissTipsIfPresent();
  });

  it('completes a full turn cycle', () => {
    cy.waitForHumanPhase('play');
    cy.assertHealth('player1', 20);
    cy.assertHealth('player2', 20);

    // Record initial state
    cy.getGameState().then(({ state }) => {
      const initialTurn = state.turn;

      // Pass the turn
      passTurn();

      // Verify we advanced
      cy.getGameState().then(({ state: nextState }) => {
        expect(nextState.turn).to.be.greaterThan(initialTurn);
      });
    });
  });

  it('energy increases across turns', () => {
    cy.waitForHumanPhase('play');

    cy.getGameState().then(({ state }) => {
      const initialEnergy = state.players.player1.maxEnergy;

      passTurn();

      cy.getGameState().then(({ state: nextState }) => {
        expect(nextState.players.player1.maxEnergy).to.be.greaterThan(initialEnergy);
      });
    });
  });
});

describe('Gameplay — creature play and combat (seed 100, fire)', () => {
  beforeEach(() => {
    cy.startGame(100, 'fire');
    cy.keepHand();
    cy.waitForAnimations();
    dismissTipsIfPresent();
  });

  it('plays a creature via store dispatch and sees it on board', () => {
    cy.waitForHumanPhase('play');

    cy.getGameState().then(({ legalActions }) => {
      const playAction = legalActions.find(
        (a) => a.type === 'PLAY_CARD' && a.targetSlot !== undefined,
      );
      if (!playAction) return;

      cy.dispatchPlayCard(playAction.cardIndex!, playAction.targetSlot!);
      cy.assertBoardCount('player1', 1);
    });
  });

  it('attacking with a creature reduces opponent health', () => {
    cy.waitForHumanPhase('play');

    // Play a creature
    cy.getGameState().then(({ legalActions }) => {
      const playAction = legalActions.find(
        (a) => a.type === 'PLAY_CARD' && a.targetSlot !== undefined,
      );
      if (playAction) {
        cy.dispatchPlayCard(playAction.cardIndex!, playAction.targetSlot!);
      }
    });

    // Pass turn 1 (summoning sickness)
    passTurn();

    // Turn 2 — try to attack
    cy.advanceToBattle();
    cy.waitForAnimations();

    cy.getGameState().then(({ legalActions }) => {
      const canAttack = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
      if (canAttack) {
        cy.allAttack();
        cy.waitForAnimations();

        cy.getGameState().then(({ state }) => {
          expect(state.players.player2.health).to.be.lessThan(20);
        });
      } else {
        cy.skipAttack();
        cy.waitForAnimations();
      }
    });
  });
});

describe('Gameplay — all-attack button visibility (seed 200, water)', () => {
  beforeEach(() => {
    cy.startGame(200, 'water');
    cy.keepHand();
    cy.waitForAnimations();
    dismissTipsIfPresent();
  });

  it('shows all-attack button when attackers are available', () => {
    cy.waitForHumanPhase('play');

    // Play a creature
    cy.getGameState().then(({ legalActions }) => {
      const playAction = legalActions.find(
        (a) => a.type === 'PLAY_CARD' && a.targetSlot !== undefined,
      );
      if (playAction) {
        cy.dispatchPlayCard(playAction.cardIndex!, playAction.targetSlot!);
      }
    });

    // Pass turn (summoning sickness)
    passTurn();

    // Battle phase — check for all-attack button
    cy.advanceToBattle();
    cy.waitForAnimations();

    cy.getGameState().then(({ legalActions }) => {
      const hasAttackers = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
      if (hasAttackers) {
        cy.get('[data-testid="all-attack-btn"]').should('be.visible');
      }
    });
  });
});

describe('Gameplay — deck element selection', () => {
  const elements = ['fire', 'water', 'earth', 'air', 'shadow'] as const;

  elements.forEach((element) => {
    it(`starts a game with ${element} deck`, () => {
      cy.startGame(42, element);
      cy.keepHand();
      cy.waitForAnimations();
      dismissTipsIfPresent();

      cy.waitForHumanPhase('play');
      cy.assertHealth('player1', 20);
      cy.assertHealth('player2', 20);
    });
  });
});

describe('Gameplay — no premature game over', () => {
  beforeEach(() => {
    cy.startGame(42, 'earth');
    cy.keepHand();
    cy.waitForAnimations();
    dismissTipsIfPresent();
  });

  it('never shows game over during normal early-game turns', () => {
    cy.waitForHumanPhase('play');
    cy.assertNoGameOver();

    cy.advanceToBattle();
    cy.assertNoGameOver();
    cy.skipAttack();
    cy.waitForAnimations();
    cy.assertNoGameOver();

    cy.endTurn();
    cy.waitForAnimations();
    cy.waitForHumanPhase('play');
    cy.assertNoGameOver();
  });
});
