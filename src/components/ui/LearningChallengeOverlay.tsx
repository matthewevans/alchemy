import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { CARD_REGISTRY } from '@engine/cards';
import { gameButtonClass } from './buttonStyles';

const ANSWER_FEEDBACK_MS = 1000;

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
  const hasOperator = tokens.includes('+') || tokens.includes('-');
  const hasEquals = tokens.includes('=');
  return hasOperator && hasEquals ? tokens : null;
}

export function LearningChallengeOverlay() {
  const state = useGameStore((s) => s.state);
  const legalActions = useGameStore((s) => s.legalActions);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const dispatch = useGameDispatch();
  const phase = state?.phase;
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedbackState | null>(null);
  const [resolvingPromptId, setResolvingPromptId] = useState<string | null>(null);
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

  useEffect(() => {
    if (resolveTimerRef.current) {
      clearTimeout(resolveTimerRef.current);
      resolveTimerRef.current = null;
    }
  }, [promptId]);

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
    ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4'
    : hasImageChoices
      ? 'grid grid-cols-2 gap-2 mt-4'
    : phase.prompt.domain === 'math'
      ? 'grid grid-cols-2 gap-2 mt-4'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-xl rounded-2xl border border-amber-400/35 bg-slate-900/95 p-5 shadow-2xl"
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-amber-200 text-xs font-semibold tracking-[0.08em] uppercase">
                Learning Bonus
              </p>
              <p className="text-white text-xl font-bold mt-1">
                {challengeLabel}
              </p>
            </div>
            <span className="inline-flex rounded-full border border-amber-300/55 bg-amber-400/20 px-3 py-1 text-xs font-bold tracking-[0.08em] text-amber-100">
              {challengeBadge}
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-300/35 bg-emerald-900/20 p-3">
            <p className="text-emerald-100/85 text-xs font-semibold uppercase tracking-[0.08em]">
              Reward Target
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-white text-sm font-semibold">{rewardTargetName}</p>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="rounded-md border border-rose-300/45 bg-rose-400/20 px-2 py-1 text-rose-100">
                  {formatSigned(phase.reward.attackBonus)} ATK
                </span>
                <span className="rounded-md border border-sky-300/45 bg-sky-400/20 px-2 py-1 text-sky-100">
                  {formatSigned(phase.reward.healthBonus)} HP
                </span>
              </div>
            </div>
          </div>

          {missingWord ? (
            <>
              <p className="text-white text-lg font-bold mt-3">
                Pick the missing letter
              </p>
              <div className="mt-2 rounded-xl border border-blue-300/35 bg-blue-950/35 p-3">
                <p className="text-blue-100/90 text-xs font-semibold uppercase tracking-[0.08em]">
                  Complete This Word
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  {missingWord.split('').map((character, index) => (
                    <span
                      key={`${character}-${index}`}
                      className={`inline-flex h-11 w-9 items-center justify-center rounded-lg border text-lg font-black ${
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
              <p className="text-white text-lg font-bold mt-3">
                Find the matching picture
              </p>
              <div className="mt-2 rounded-xl border border-cyan-300/35 bg-cyan-950/30 p-3">
                <p className="text-cyan-100/90 text-xs font-semibold uppercase tracking-[0.08em]">
                  Target Word
                </p>
                <p className="mt-2 text-center text-3xl font-black tracking-[0.14em] text-white">
                  {wordPictureTarget}
                </p>
              </div>
            </>
          ) : mathTokens ? (
            <>
              <p className="text-white text-lg font-bold mt-3">
                Solve this math problem
              </p>
              <div className="mt-2 rounded-xl border border-blue-300/35 bg-blue-950/35 p-3">
                <p className="text-blue-100/90 text-xs font-semibold uppercase tracking-[0.08em]">
                  Equation
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  {mathTokens.map((token, index) => {
                    const tokenClass =
                      token === '?'
                        ? 'border-amber-300/80 bg-amber-400/15 text-amber-100'
                        : token === '+' || token === '-' || token === '='
                          ? 'border-blue-300/70 bg-blue-500/20 text-blue-100'
                          : 'border-white/25 bg-white/8 text-white';
                    return (
                      <span
                        key={`${token}-${index}`}
                        className={`inline-flex h-11 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-2xl font-black tabular-nums ${tokenClass}`}
                      >
                        {token}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-white text-lg font-bold mt-1">
              {phase.prompt.prompt}
            </p>
          )}
          <p className="text-white/60 text-sm mt-2">
            Answer correctly for a temporary combat bonus.
          </p>
          {!singleLetterChoices && phase.prompt.domain !== 'math' && (
            <p className="text-emerald-200/95 text-sm mt-2 font-semibold">
              Reward: {rewardText}
            </p>
          )}

          <div className={optionGridClass}>
            {phase.prompt.options.map((option) => {
              const action = answerActionsById.get(option.id);
              const isSelected = activeFeedback?.optionId === option.id;
              const tone = isSelected ? (activeFeedback?.correct ? 'emerald' : 'red') : 'blue';
              const isDisabled = isResolvingAnswer || !action;
              const optionLayoutClass = option.imageId
                ? 'h-auto p-2 justify-center'
                : centeredAnswerChoices
                  ? 'h-16 justify-center text-center'
                  : 'text-left justify-start';
              return (
                <button
                  key={option.id}
                  className={gameButtonClass({
                    tone,
                    size: 'md',
                    disabled: isDisabled,
                    className: `w-full ${optionLayoutClass} ${isResolvingAnswer && !isSelected ? 'opacity-80' : ''}`,
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
                    <span className="flex w-full flex-col items-center gap-2">
                      <img
                        src={option.imageId}
                        alt={option.text}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                      <span className="rounded-md border border-slate-300/45 bg-slate-900/40 px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-100/90">
                        {option.text}
                      </span>
                    </span>
                  ) : singleLetterChoices ? (
                    <span className="text-2xl font-black tracking-[0.14em]">
                      {option.text}
                    </span>
                  ) : phase.prompt.domain === 'math' ? (
                    <span className="text-2xl font-black tabular-nums">
                      {option.text}
                    </span>
                  ) : option.text}
                </button>
              );
            })}
          </div>
          {feedbackText && (
            <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
              activeFeedback?.correct
                ? 'border-emerald-300/45 bg-emerald-900/20 text-emerald-200'
                : 'border-red-300/45 bg-red-900/20 text-red-200'
            }`}
            >
              {feedbackText}
            </p>
          )}

          {skipAction && (
            <div className="mt-3 flex justify-end">
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
      </motion.div>
    </AnimatePresence>
  );
}
