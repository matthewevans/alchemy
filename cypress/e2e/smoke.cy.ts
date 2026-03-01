describe('Smoke test', () => {
  it('loads home page, starts a game, and reaches play phase', () => {
    cy.startGame(42, 'fire');
    cy.keepHand();
    cy.waitForAnimations();

    // Game board should be visible with both players at 20 HP
    cy.assertHealth('player1', 20);
    cy.assertHealth('player2', 20);

    // Should be in a play-related phase (draw/energy auto-advance)
    cy.waitForPhase('play');
  });
});
