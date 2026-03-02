describe('Seeded game — seed 300, earth deck', () => {
  beforeEach(() => {
    cy.startGame(300, 'earth');
    cy.keepHand();
    cy.waitForAnimations();
    // Dismiss quick-tips overlay if present
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Got it")').length) {
        cy.contains('button', 'Got it').click();
      }
    });
  });

  it('starts with correct initial state', () => {
    cy.assertHealth('player1', 20);
    cy.assertHealth('player2', 20);
    cy.waitForPhase('play');
  });

  it('can play a card from hand', () => {
    cy.waitForPhase('play');
    cy.waitForAnimations();

    // Find a playable creature from the store and dispatch it directly
    cy.getGameState().then(({ legalActions }) => {
      const playAction = legalActions.find(
        (a) => a.type === 'PLAY_CARD' && a.targetSlot !== undefined,
      );
      if (!playAction) throw new Error('No playable creature card found');
      cy.dispatchPlayCard(playAction.cardIndex!, playAction.targetSlot!);
    });

    // Should have 1 creature on board
    cy.assertBoardCount('player1', 1);
  });

  it('can skip attack and end turn', () => {
    cy.waitForPhase('play');
    cy.waitForAnimations();

    // Advance to battle phase
    cy.contains('button', 'Battle!').click();
    cy.waitForAnimations();

    // Skip attack — lands at post-combat play (play2)
    cy.skipAttack();
    cy.waitForAnimations();
    cy.waitForPhase('play2');

    // End turn — advances through opponent's turn and back to our play phase
    cy.contains('button', 'End Turn').click();
    cy.waitForAnimations();
    cy.waitForPhase('play');
  });
});
