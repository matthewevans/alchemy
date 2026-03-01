describe('Seeded game — seed 300, earth deck', () => {
  beforeEach(() => {
    cy.startGame(300, 'earth');
    cy.keepHand();
    cy.waitForAnimations();
  });

  it('starts with correct initial state', () => {
    cy.assertHealth('player1', 20);
    cy.assertHealth('player2', 20);
    cy.waitForPhase('play');
  });

  it('can play a card from hand', () => {
    cy.waitForPhase('play');

    // Click first hand card, then click a board slot to play it
    cy.clickHandCard(0);
    cy.clickBoardSlot(0);
    cy.waitForAnimations();

    // Should have at least 1 creature on board
    cy.assertBoardCount('player1', 1);
  });

  it('can skip attack and end turn', () => {
    cy.waitForPhase('play');

    // Advance to battle phase
    cy.get('[data-testid="phase-strip"]')
      .parent()
      .find('button')
      .contains('Battle')
      .click();
    cy.waitForAnimations();

    // Skip attack
    cy.skipAttack();
    cy.waitForAnimations();

    // After skipping, we should advance through opponent turn and back
    // Wait for our next play phase
    cy.waitForPhase('play');
  });
});
