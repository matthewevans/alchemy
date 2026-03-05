export type TutorialStepId =
  | 'first_energy'
  | 'first_play'
  | 'first_battle'
  | 'first_block'
  | 'targeting'
  | 'learning_challenge'
  | 'discard_phase'
  | 'block_order'
  | 'combat_math';

export interface TutorialStepDef {
  id: TutorialStepId;
  message: string;
  anchorSelector?: string;
}

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStepDef> = {
  first_energy: {
    id: 'first_energy',
    message: 'You got energy! Each turn you get one more. Play a card that costs that much!',
    anchorSelector: '[data-testid="phase-strip"]',
  },
  first_play: {
    id: 'first_play',
    message: 'Tap a glowing card to play it! Glowing cards are ones you can afford.',
    anchorSelector: '[data-hand-area]',
  },
  first_battle: {
    id: 'first_battle',
    message: 'Time to fight! Select your creatures to choose who attacks.',
    anchorSelector: '[data-testid="phase-strip"]',
  },
  first_block: {
    id: 'first_block',
    message: 'The bad guys are attacking! Select your creatures to block them.',
    anchorSelector: '[data-testid="phase-strip"]',
  },
  targeting: {
    id: 'targeting',
    message: 'A spell needs a target. Tap any glowing creature or hero.',
    anchorSelector: '[data-testid="combat-controls"]',
  },
  learning_challenge: {
    id: 'learning_challenge',
    message: 'Solve this quick challenge to power up your highlighted creature.',
    anchorSelector: '.learning-overlay-dialog',
  },
  discard_phase: {
    id: 'discard_phase',
    message: 'Your hand is full. Tap cards to discard until the prompt is satisfied.',
    anchorSelector: '[data-hand-area]',
  },
  block_order: {
    id: 'block_order',
    message: 'When one attacker is blocked by many defenders, choose the damage order.',
    anchorSelector: '[data-testid="combat-controls"]',
  },
  combat_math: {
    id: 'combat_math',
    message: 'Tap the combat bubble between blockers and attackers to preview who survives.',
    anchorSelector: '[data-testid="combat-controls"]',
  },
};

export const TUTORIAL_STEP_IDS = Object.keys(TUTORIAL_STEPS) as TutorialStepId[];

export const TIP_MENU_ORDER: TutorialStepId[] = [
  'first_energy',
  'first_play',
  'first_battle',
  'first_block',
  'targeting',
  'learning_challenge',
  'discard_phase',
  'block_order',
  'combat_math',
];

export const TIP_MENU_LABELS: Record<TutorialStepId, string> = {
  first_energy: 'Energy',
  first_play: 'Playing Cards',
  first_battle: 'Attacking',
  first_block: 'Blocking',
  targeting: 'Targeting',
  learning_challenge: 'Learning Challenges',
  discard_phase: 'Discard Phase',
  block_order: 'Block Order',
  combat_math: 'Combat Math',
};
