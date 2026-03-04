import type { GameAction, GameState, PlayerId, RNG } from './types';
import { getActingPlayer } from './types';
import { enumerateLegalActions } from './validation';
import { reduce } from './reducer';
import { evaluateState, softmaxSelect } from './aiEval';
import type { AIConfig, AISearchConfig } from './aiConfig';
import type { SeededRNG } from './prng';
import { restoreRNG } from './prng';
import { filterAIViableActions } from './aiActionPolicy';

interface SearchState {
  state: GameState;
  rngState: number;
}

interface SearchBudget {
  used: number;
  maxNodes: number;
}

interface ScoredAction {
  action: GameAction;
  score: number;
}

interface SearchTableEntry {
  depth: number;
  value: number;
  bestAction?: GameAction;
}

type SearchTable = Map<string, SearchTableEntry>;

function isSeededRNG(rng: RNG): rng is SeededRNG {
  return typeof (rng as SeededRNG).getState === 'function';
}

function canUseSearch(config: AIConfig | undefined, phaseType: GameState['phase']['type']): config is AIConfig & {
  search: AISearchConfig;
} {
  if (!config?.search?.enabled || config.policy !== 'tree_search') return false;
  return phaseType === 'play' || phaseType === 'targeting';
}

function actionKey(action: GameAction): string {
  return JSON.stringify(action);
}

function buildSearchKey(searchState: SearchState, aiPlayer: PlayerId): string {
  return `${aiPlayer}|${searchState.rngState}|${JSON.stringify(searchState.state)}`;
}

function getSearchLegalActions(state: GameState, actingPlayer: PlayerId): GameAction[] {
  return filterAIViableActions(state, actingPlayer, enumerateLegalActions(state, actingPlayer));
}

function simulateAction(searchState: SearchState, action: GameAction, actingPlayer: PlayerId): SearchState | null {
  try {
    const simRng = restoreRNG(searchState.rngState);
    const nextState = reduce(searchState.state, action, actingPlayer, simRng).newState;
    return { state: nextState, rngState: simRng.getState() };
  } catch {
    return null;
  }
}

function orderActions(
  searchState: SearchState,
  actions: GameAction[],
  actingPlayer: PlayerId,
  aiPlayer: PlayerId,
  config: AIConfig & { search: AISearchConfig },
  preferredAction?: GameAction,
): GameAction[] {
  const scored: ScoredAction[] = [];
  for (const action of actions) {
    const next = simulateAction(searchState, action, actingPlayer);
    if (!next) continue;
    const score = evaluateState(next.state, aiPlayer, config.weights);
    scored.push({ action, score });
  }

  if (scored.length === 0) return [];

  const isMaxNode = actingPlayer === aiPlayer;
  scored.sort((a, b) => (isMaxNode ? b.score - a.score : a.score - b.score));

  if (preferredAction) {
    const preferred = actionKey(preferredAction);
    const preferredIndex = scored.findIndex((entry) => actionKey(entry.action) === preferred);
    if (preferredIndex > 0) {
      const [entry] = scored.splice(preferredIndex, 1);
      scored.unshift(entry);
    }
  }

  const cap = Math.max(1, config.search.maxBranching);
  return scored.slice(0, cap).map((entry) => entry.action);
}

function evaluateWithRollout(
  searchState: SearchState,
  aiPlayer: PlayerId,
  config: AIConfig & { search: AISearchConfig },
): number {
  const rolloutDepth = Math.max(0, config.search.rolloutDepth);
  if (rolloutDepth === 0) {
    return evaluateState(searchState.state, aiPlayer, config.weights);
  }

  let current = searchState;
  for (let ply = 0; ply < rolloutDepth; ply++) {
    if (current.state.phase.type === 'game_over') {
      break;
    }

    const acting = getActingPlayer(current.state);
    if (!acting) break;

    const legal = getSearchLegalActions(current.state, acting);
    if (legal.length === 0) break;

    const ordered = orderActions(current, legal, acting, aiPlayer, config);
    const chosen = ordered[0];
    if (!chosen) break;

    const next = simulateAction(current, chosen, acting);
    if (!next) break;
    current = next;
  }

  return evaluateState(current.state, aiPlayer, config.weights);
}

function searchValue(
  searchState: SearchState,
  aiPlayer: PlayerId,
  depth: number,
  alpha: number,
  beta: number,
  config: AIConfig & { search: AISearchConfig },
  budget: SearchBudget,
  table: SearchTable | null,
): number {
  if (budget.used >= budget.maxNodes) {
    return evaluateWithRollout(searchState, aiPlayer, config);
  }

  const key = table ? buildSearchKey(searchState, aiPlayer) : null;
  const cached = key ? table?.get(key) : undefined;
  if (cached && cached.depth >= depth) {
    return cached.value;
  }

  budget.used += 1;

  if (depth <= 0 || searchState.state.phase.type === 'game_over') {
    const leaf = evaluateWithRollout(searchState, aiPlayer, config);
    if (key && table) {
      table.set(key, { depth, value: leaf, bestAction: cached?.bestAction });
    }
    return leaf;
  }

  const acting = getActingPlayer(searchState.state);
  if (!acting) {
    const leaf = evaluateWithRollout(searchState, aiPlayer, config);
    if (key && table) {
      table.set(key, { depth, value: leaf, bestAction: cached?.bestAction });
    }
    return leaf;
  }

  const legal = getSearchLegalActions(searchState.state, acting);
  if (legal.length === 0) {
    const leaf = evaluateWithRollout(searchState, aiPlayer, config);
    if (key && table) {
      table.set(key, { depth, value: leaf, bestAction: cached?.bestAction });
    }
    return leaf;
  }

  const ordered = orderActions(searchState, legal, acting, aiPlayer, config, cached?.bestAction);
  if (ordered.length === 0) {
    const leaf = evaluateWithRollout(searchState, aiPlayer, config);
    if (key && table) {
      table.set(key, { depth, value: leaf, bestAction: cached?.bestAction });
    }
    return leaf;
  }

  if (acting === aiPlayer) {
    let best = Number.NEGATIVE_INFINITY;
    let bestAction: GameAction | undefined;
    let localAlpha = alpha;
    for (const action of ordered) {
      const next = simulateAction(searchState, action, acting);
      if (!next) continue;
      const value = searchValue(
        next,
        aiPlayer,
        depth - 1,
        localAlpha,
        beta,
        config,
        budget,
        table,
      );
      if (value > best) {
        best = value;
        bestAction = action;
      }
      if (best > localAlpha) localAlpha = best;
      if (localAlpha >= beta) break;
    }

    const value = best === Number.NEGATIVE_INFINITY
      ? evaluateWithRollout(searchState, aiPlayer, config)
      : best;
    if (key && table) {
      table.set(key, { depth, value, bestAction });
    }
    return value;
  }

  let best = Number.POSITIVE_INFINITY;
  let bestAction: GameAction | undefined;
  let localBeta = beta;
  for (const action of ordered) {
    const next = simulateAction(searchState, action, acting);
    if (!next) continue;
    const value = searchValue(
      next,
      aiPlayer,
      depth - 1,
      alpha,
      localBeta,
      config,
      budget,
      table,
    );
    if (value < best) {
      best = value;
      bestAction = action;
    }
    if (best < localBeta) localBeta = best;
    if (alpha >= localBeta) break;
  }
  const value = best === Number.POSITIVE_INFINITY
    ? evaluateWithRollout(searchState, aiPlayer, config)
    : best;
  if (key && table) {
    table.set(key, { depth, value, bestAction });
  }
  return value;
}

function chooseBySearchScores(
  scored: ScoredAction[],
  rng: RNG,
  temperature: number,
): GameAction | null {
  if (scored.length === 0) return null;
  if (scored.length === 1) return scored[0].action;

  const scores = scored.map((entry) => entry.score);
  const index = softmaxSelect(scores, temperature, rng());
  return scored[index]?.action ?? null;
}

export function chooseActionByTreeSearch(
  state: GameState,
  aiPlayer: PlayerId,
  rng: RNG,
  config: AIConfig | undefined,
  rootActions?: GameAction[],
): GameAction | null {
  if (!isSeededRNG(rng)) return null;
  if (!canUseSearch(config, state.phase.type)) return null;
  if (getActingPlayer(state) !== aiPlayer) return null;

  const legal = filterAIViableActions(state, aiPlayer, rootActions ?? getSearchLegalActions(state, aiPlayer));
  if (legal.length <= 1) {
    return legal[0] ?? null;
  }

  const root: SearchState = { state, rngState: rng.getState() };
  const table: SearchTable | null = config.search.useTransposition ? new Map() : null;
  const budget: SearchBudget = { used: 0, maxNodes: Math.max(1, config.search.maxNodes) };
  const maxDepth = Math.max(1, config.search.maxDepth);
  let scored: ScoredAction[] = [];

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (budget.used >= budget.maxNodes) break;

    const rootKey = table ? buildSearchKey(root, aiPlayer) : null;
    const preferredRootAction = rootKey ? table?.get(rootKey)?.bestAction : undefined;
    const orderedRoot = orderActions(
      root,
      legal,
      aiPlayer,
      aiPlayer,
      config,
      preferredRootAction,
    );
    if (orderedRoot.length === 0) break;

    const iterationScores: ScoredAction[] = [];
    for (const action of orderedRoot) {
      if (budget.used >= budget.maxNodes) break;
      const next = simulateAction(root, action, aiPlayer);
      if (!next) continue;
      const score = searchValue(
        next,
        aiPlayer,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        config,
        budget,
        table,
      );
      iterationScores.push({ action, score });
    }

    if (iterationScores.length === 0) {
      continue;
    }
    scored = iterationScores;

    if (rootKey && table) {
      const bestRoot = iterationScores.reduce(
        (best, entry) => (entry.score > best.score ? entry : best),
        iterationScores[0],
      );
      table.set(rootKey, { depth, value: bestRoot.score, bestAction: bestRoot.action });
    }
  }

  return chooseBySearchScores(scored, rng, config.temperature);
}
