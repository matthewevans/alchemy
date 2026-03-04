import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { CARD_REGISTRY } from '@engine/cards';
import { gameButtonClass } from './buttonStyles';

const ANSWER_FEEDBACK_MS = 3000;

interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CELEBRATION_GLYPHS = ['✨', '⭐', '💫', '🌟'] as const;

interface AnswerFeedbackState {
  optionId: string;
  correct: boolean;
  promptId: string;
}

function formatRewardText(
  attackBonus: number,
  healthBonus: number,
  targetName: string,
): string {
  const attack = `${attackBonus >= 0 ? '+' : ''}${attackBonus}`;
  const health = `${healthBonus >= 0 ? '+' : ''}${healthBonus}`;
  return `${targetName} gets ${attack}/${health} until end of turn.`;
}

function getMissingLetterWord(promptText: string): string | null {
  const match = promptText.match(/:\s*([a-z_]+)/i);
  return match ? match[1].toUpperCase() : null;
}

function getWordPictureTarget(promptText: string): string | null {
  const match = promptText.match(/:\s*([a-z]+)/i);
  return match ? match[1].toUpperCase() : null;
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function getMathTokens(promptText: string): string[] | null {
  const tokens = promptText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const hasOperator = tokens.includes('+')
    || tokens.includes('-')
    || tokens.includes('×')
    || tokens.includes('÷');
  const hasEquals = tokens.includes('=');
  return hasOperator && hasEquals ? tokens : null;
}

function samePosition(a: ElementPosition | null, b: ElementPosition | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function getRewardCardPosition(permanentId: string): ElementPosition | null {
  const element = document.querySelector<HTMLElement>(`[data-testid="board-card-${permanentId}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

export function LearningChallengeOverlay() {
  const state = useGameStore((s) => s.state);
  const legalActions = useGameStore((s) => s.legalActions);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const dispatch = useGameDispatch();
  const phase = state?.phase;
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedbackState | null>(null);
  const [resolvingPromptId, setResolvingPromptId] = useState<string | null>(null);
  const [rewardPosition, setRewardPosition] = useState<ElementPosition | null>(null);
  const [isShortViewport, setIsShortViewport] = useState(
    () => typeof window !== 'undefined' && window.innerHeight < 500,
  );
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resolveTimerRef.current) {
        clearTimeout(resolveTimerRef.current);
        resolveTimerRef.current = null;
      }
    };
  }, []);

  const promptId =
    phase && phase.type === 'learning' && phase.player === humanPlayer
      ? phase.prompt.id
      : null;
  const rewardPermanentId =
    phase && phase.type === 'learning' && phase.player === humanPlayer
      ? phase.reward.permanentId
      : null;

  useEffect(() => {
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current);
      resolveTimerRef.current = null;
    }
  }, [promptId]);

  useEffect(() => {
    if (!rewardPermanentId) return undefined;

    const syncPosition = () => {
      const nextPosition = getRewardCardPosition(rewardPermanentId);
      setRewardPosition((prev) => (samePosition(prev, nextPosition) ? prev : nextPosition));
    };

    const frameId = window.requestAnimationFrame(syncPosition);
    const intervalId = window.setInterval(syncPosition, 48);
    window.addEventListener('resize', syncPosition);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(intervalId);
      window.removeEventListener('resize', syncPosition);
    };
  }, [rewardPermanentId]);

  useEffect(() => {
    const updateViewportState = () => {
      setIsShortViewport(window.innerHeight < 500);
    };
    updateViewportState();
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, []);

  if (!state || !phase || phase.type !== 'learning' || phase.player !== humanPlayer) {
    return null;
  }

  const rewardTarget = [...state.players.player1.board, ...state.players.player2.board]
    .find((permanent) => permanent?.permanentId === phase.reward.permanentId);
  const rewardTargetName = rewardTarget ? CARD_REGISTRY[rewardTarget.cardId]?.name ?? 'your creature' : 'your creature';
  const promptKey = phase.prompt.id;
  const rewardText = formatRewardText(
    phase.reward.attackBonus,
    phase.reward.healthBonus,
    rewardTargetName,
  );

  const answerActionsById = new Map(
    legalActions
      .filter((action): action is Extract<typeof legalActions[number], { type: 'ANSWER_LEARNING_CHALLENGE' }> =>
        action.type === 'ANSWER_LEARNING_CHALLENGE')
      .map((action) => [action.optionId, action]),
  );
  const skipAction = legalActions.find((action) => action.type === 'SKIP_LEARNING_CHALLENGE');
  const activeFeedback =
    answerFeedback && answerFeedback.promptId === promptKey ? answerFeedback : null;
  const isResolvingAnswer =
    resolvingPromptId !== null && resolvingPromptId === promptKey;
  const isSkipDisabled = isResolvingAnswer;
  const feedbackText = activeFeedback
    ? activeFeedback.correct
      ? `Correct! ${rewardText}`
      : 'Not quite. No bonus this time.'
    : null;
  const feedbackToneClass = activeFeedback?.correct
    ? 'border-emerald-300/45 bg-emerald-900/25 text-emerald-100'
    : 'border-red-300/45 bg-red-900/25 text-red-100';
  const feedbackIcon = activeFeedback?.correct ? '✨' : '⚡';
  const feedbackHeadline = activeFeedback?.correct ? 'Great answer!' : 'Close one!';
  const celebrationTone = activeFeedback?.correct ? 'success' : 'retry';
  const missingWord =
    phase.prompt.kind === 'missing_letter'
      ? getMissingLetterWord(phase.prompt.prompt)
      : null;
  const wordPictureTarget =
    phase.prompt.kind === 'word_to_picture'
      ? getWordPictureTarget(phase.prompt.prompt)
      : null;
  const mathTokens =
    phase.prompt.domain === 'math'
      ? getMathTokens(phase.prompt.prompt)
      : null;
  const singleLetterChoices =
    phase.prompt.kind === 'missing_letter'
    && phase.prompt.options.every((option) => option.text.trim().length === 1 && !option.imageId);
  const hasImageChoices = phase.prompt.options.some((option) => option.imageId);
  const centeredAnswerChoices = singleLetterChoices || phase.prompt.domain === 'math';
  const challengeLabel = phase.prompt.domain === 'reading' ? 'Reading Challenge' : 'Math Challenge';
  const challengeBadge = phase.prompt.domain === 'reading' ? 'READING' : 'MATH';
  const optionGridClass = singleLetterChoices
    ? 'grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mt-3 sm:mt-4'
    : hasImageChoices
      ? 'grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4'
    : phase.prompt.domain === 'math'
      ? 'grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4';
  const optionGridSizeClass = hasImageChoices
    ? 'learning-overlay-option-grid-image'
    : 'learning-overlay-option-grid-text';
  const panelDesktopPlacementClass = rewardTarget?.ownerId === humanPlayer
    ? 'sm:self-start sm:mt-[calc(env(safe-area-inset-top)+0.75rem)]'
    : 'sm:self-end sm:mb-[calc(var(--card-height)*0.52+env(safe-area-inset-bottom)+0.5rem)]';
  const activeRewardPosition = rewardPermanentId ? rewardPosition : null;
  const showBadgeBelowCard = activeRewardPosition ? activeRewardPosition.y < 108 : false;
  const rewardBadgeStyle = activeRewardPosition
    ? {
      left: activeRewardPosition.x + activeRewardPosition.width / 2,
      top: showBadgeBelowCard
        ? activeRewardPosition.y + activeRewardPosition.height + 10
        : activeRewardPosition.y - 12,
    }
    : null;

  return (
    <AnimatePresence>
      <motion.div
        className="learning-overlay-root fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-sm p-2 sm:items-start sm:justify-end sm:bg-transparent sm:backdrop-blur-none sm:p-0 sm:pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {rewardBadgeStyle && (
          <motion.div
            className="pointer-events-none fixed z-[2] hidden sm:block"
            style={rewardBadgeStyle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <div
              className={`rounded-lg border border-emerald-300/65 bg-slate-950/90 px-3 py-1.5 text-xs font-bold text-emerald-100 shadow-xl backdrop-blur-sm ${
                showBadgeBelowCard
                  ? 'translate-x-[-50%]'
                  : 'translate-x-[-50%] translate-y-[-100%]'
              }`}
            >
              <span>{formatSigned(phase.reward.attackBonus)} ATK</span>
              <span className="mx-2 text-emerald-200/60">•</span>
              <span>{formatSigned(phase.reward.healthBonus)} HP</span>
            </div>
          </motion.div>
        )}
        <motion.div
          className={`learning-overlay-dialog relative z-[3] w-full max-w-xl max-h-[calc(100dvh-0.75rem)] overflow-y-auto rounded-2xl border border-amber-300/45 bg-slate-900/95 p-3 shadow-2xl sm:pointer-events-auto sm:mr-[calc(var(--sidebar-w)+0.75rem)] sm:max-w-md sm:p-5 ${panelDesktopPlacementClass}`}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeFeedback && (
            <motion.div
              className={`pointer-events-none absolute inset-0 rounded-2xl ${
                celebrationTone === 'success'
                  ? 'bg-emerald-400/10'
                  : 'bg-red-400/10'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.05, 0.24, 0.06] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-amber-100 text-[11px] font-semibold tracking-[0.08em] uppercase">
                Battle Challenge
              </p>
              <p className="learning-overlay-domain-title text-white text-lg sm:text-xl font-bold mt-1">
                {challengeLabel}
              </p>
            </div>
            <span className="learning-overlay-badge inline-flex rounded-full border border-amber-300/55 bg-amber-400/20 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold tracking-[0.08em] text-amber-100">
              {challengeBadge}
            </span>
          </div>

          <div className="learning-overlay-stepbar mt-2.5 sm:mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-slate-950/35 px-2.5 sm:px-3 py-1.5 sm:py-2">
            <p className="text-center text-[11px] sm:text-xs font-semibold uppercase tracking-[0.06em] text-slate-200">
              1. Solve
            </p>
            <span className="text-slate-400 text-xs sm:text-sm">→</span>
            <p className="text-center text-[11px] sm:text-xs font-semibold uppercase tracking-[0.06em] text-emerald-200">
              2. Power Up
            </p>
          </div>

          <div className="learning-overlay-reward mt-2.5 sm:mt-3 rounded-xl border border-emerald-300/35 bg-emerald-900/20 p-2.5 sm:p-3">
            <p className="text-emerald-100/85 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em]">
              Bonus Locked On
            </p>
            <div className="mt-1 flex items-center justify-between gap-2 sm:gap-3">
              <div>
                <p className="text-white text-xs sm:text-sm font-semibold">{rewardTargetName}</p>
                <p className="learning-overlay-target-hint text-[11px] sm:text-xs text-emerald-100/75 mt-0.5">Look for the glowing ring on the battlefield.</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold">
                <span className="rounded-md border border-rose-300/45 bg-rose-400/20 px-1.5 sm:px-2 py-0.5 sm:py-1 text-rose-100">
                  {formatSigned(phase.reward.attackBonus)} ATK
                </span>
                <span className="rounded-md border border-sky-300/45 bg-sky-400/20 px-1.5 sm:px-2 py-0.5 sm:py-1 text-sky-100">
                  {formatSigned(phase.reward.healthBonus)} HP
                </span>
              </div>
            </div>
          </div>

          {missingWord ? (
            <>
              <p className="text-white text-base sm:text-lg font-bold mt-2.5 sm:mt-3">
                Pick the missing letter
              </p>
              <div className="learning-overlay-prompt-card mt-1.5 sm:mt-2 rounded-xl border border-blue-300/35 bg-blue-950/35 p-2.5 sm:p-3">
                <p className="text-blue-100/90 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em]">
                  Complete This Word
                </p>
                <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {missingWord.split('').map((character, index) => (
                    <span
                      key={`${character}-${index}`}
                      className={`inline-flex h-9 w-8 sm:h-11 sm:w-9 items-center justify-center rounded-lg border text-base sm:text-lg font-black ${
                        character === '_'
                          ? 'border-amber-300/80 bg-amber-400/15 text-amber-100'
                          : 'border-white/25 bg-white/8 text-white'
                      }`}
                    >
                      {character === '_' ? '?' : character}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : wordPictureTarget ? (
            <>
              <p className="text-white text-base sm:text-lg font-bold mt-2.5 sm:mt-3">
                Find the matching picture
              </p>
              <div className="learning-overlay-prompt-card mt-1.5 sm:mt-2 rounded-xl border border-cyan-300/35 bg-cyan-950/30 p-2.5 sm:p-3">
                <p className="text-cyan-100/90 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em]">
                  Target Word
                </p>
                <p className="mt-1.5 sm:mt-2 text-center text-2xl sm:text-3xl font-black tracking-[0.14em] text-white">
                  {wordPictureTarget}
                </p>
              </div>
            </>
          ) : mathTokens ? (
            <>
              <p className="text-white text-base sm:text-lg font-bold mt-2.5 sm:mt-3">
                Solve this math problem
              </p>
              <div className="learning-overlay-prompt-card mt-1.5 sm:mt-2 rounded-xl border border-blue-300/35 bg-blue-950/35 p-2.5 sm:p-3">
                <p className="text-blue-100/90 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em]">
                  Equation
                </p>
                <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {mathTokens.map((token, index) => {
                    const tokenClass =
                      token === '?'
                        ? 'border-amber-300/80 bg-amber-400/15 text-amber-100'
                        : token === '+'
                          || token === '-'
                          || token === '×'
                          || token === '÷'
                          || token === '='
                          ? 'border-blue-300/70 bg-blue-500/20 text-blue-100'
                          : 'border-white/25 bg-white/8 text-white';
                    return (
                      <span
                        key={`${token}-${index}`}
                        className={`inline-flex h-9 min-w-[2rem] sm:h-11 sm:min-w-[2.25rem] items-center justify-center rounded-lg border px-1.5 sm:px-2 text-xl sm:text-2xl font-black tabular-nums ${tokenClass}`}
                      >
                        {token}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-white text-base sm:text-lg font-bold mt-1">
              {phase.prompt.prompt}
            </p>
          )}
          <p className="learning-overlay-instruction text-white/60 text-xs sm:text-sm mt-2">
            Answer correctly to empower the highlighted creature.
          </p>

          <div className={`learning-overlay-option-grid ${optionGridSizeClass} ${optionGridClass}`}>
            {phase.prompt.options.map((option) => {
              const action = answerActionsById.get(option.id);
              const isSelected = activeFeedback?.optionId === option.id;
              const tone = isSelected ? (activeFeedback?.correct ? 'emerald' : 'red') : 'blue';
              const isDisabled = isResolvingAnswer || !action;
              const optionLayoutClass = option.imageId
                ? 'h-auto p-1.5 sm:p-2 justify-center'
                : centeredAnswerChoices
                  ? 'h-12 sm:h-16 justify-center text-center'
                  : 'text-left justify-start';
              return (
                <button
                  key={option.id}
                  className={gameButtonClass({
                    tone,
                    size: 'md',
                    disabled: isDisabled,
                    className: `learning-overlay-option-btn relative w-full overflow-hidden ${optionLayoutClass} ${isResolvingAnswer && !isSelected ? 'opacity-80' : ''}`,
                  })}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!action || isResolvingAnswer) return;
                    const correct = option.id === phase.prompt.correctOptionId;
                    setAnswerFeedback({ optionId: option.id, correct, promptId: promptKey });
                    setResolvingPromptId(promptKey);
                    resolveTimerRef.current = setTimeout(() => {
                      resolveTimerRef.current = null;
                      setResolvingPromptId(null);
                      dispatch(action, humanPlayer);
                    }, ANSWER_FEEDBACK_MS);
                  }}
                >
                  {option.imageId ? (
                    <span className="learning-overlay-image-option relative flex w-full flex-col items-center gap-2">
                      <img
                        src={option.imageId}
                        alt={option.text}
                        className="h-20 sm:h-24 w-full rounded-lg object-cover"
                      />
                      <span className="learning-overlay-image-label absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 rounded-md border border-slate-300/45 bg-slate-900/65 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100/90">
                        {option.text}
                      </span>
                    </span>
                  ) : singleLetterChoices ? (
                    <span className="text-xl sm:text-2xl font-black tracking-[0.14em]">
                      {option.text}
                    </span>
                  ) : phase.prompt.domain === 'math' ? (
                    <span className="text-xl sm:text-2xl font-black tabular-nums">
                      {option.text}
                    </span>
                  ) : option.text}
                  {isSelected && activeFeedback && (
                    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                      {Array.from({ length: 8 }).map((_, i) => {
                        const angle = (Math.PI * 2 * i) / 8;
                        const x = Math.cos(angle) * 44;
                        const y = Math.sin(angle) * 26;
                        return (
                          <motion.span
                            key={`${option.id}-burst-${i}`}
                            className="absolute left-1/2 top-1/2 text-sm"
                            aria-hidden="true"
                            initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                            animate={{
                              x,
                              y,
                              opacity: [0, 1, 0],
                              scale: [0.6, 1, 0.7],
                              rotate: [0, i % 2 === 0 ? 18 : -18],
                            }}
                            transition={{
                              duration: activeFeedback.correct ? 0.95 : 0.75,
                              delay: i * 0.03,
                              ease: 'easeOut',
                            }}
                          >
                            {activeFeedback.correct ? CELEBRATION_GLYPHS[i % CELEBRATION_GLYPHS.length] : '⚡'}
                          </motion.span>
                        );
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {feedbackText && !isShortViewport && (
            <motion.div
              className={`learning-overlay-feedback learning-overlay-feedback-inline mt-2.5 sm:mt-3 rounded-xl border px-2.5 sm:px-3 py-2.5 sm:py-3 ${feedbackToneClass}`}
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: [1, 1.03, 1], y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl leading-none">
                  {feedbackIcon}
                </span>
                <p className="text-sm sm:text-base font-black">
                  {feedbackHeadline}
                </p>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-semibold">
                {feedbackText}
              </p>
            </motion.div>
          )}

          {skipAction && (
            <div className="mt-2.5 sm:mt-3 flex justify-end">
              <button
                className={gameButtonClass({
                  tone: 'slate',
                  size: 'sm',
                  disabled: isSkipDisabled,
                  className: 'font-semibold',
                })}
                disabled={isSkipDisabled}
                onClick={() => {
                  if (isResolvingAnswer) return;
                  dispatch(skipAction, humanPlayer);
                }}
              >
                Skip
              </button>
            </div>
          )}
        </motion.div>
        {feedbackText && isShortViewport && (
          <motion.div
            className="learning-overlay-feedback-floating pointer-events-none fixed inset-0 z-[80] hidden items-center justify-center px-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`learning-overlay-feedback ${feedbackToneClass} w-full max-w-[18.25rem] rounded-xl border px-3 py-3 shadow-2xl backdrop-blur-sm`}
              initial={{ opacity: 0, scale: 0.88, y: 10 }}
              animate={{ opacity: 1, scale: [1, 1.04, 1], y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{feedbackIcon}</span>
                <p className="text-base font-black">{feedbackHeadline}</p>
              </div>
              <p className="mt-1 text-sm font-semibold">{feedbackText}</p>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
