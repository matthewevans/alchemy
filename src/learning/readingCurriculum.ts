import type { ReadingLevel } from './config';

export interface PictureVocabularyItem {
  word: string;
  imagePath: string;
}

export interface ReadingLevelCurriculum {
  /**
   * Decodable words ordered by progressive phonics patterns:
   * - short vowels/CVC
   * - digraphs + blends
   * - long vowels (VCe, vowel teams)
   * - multisyllable + morphology
   *
   * Evidence base:
   * - National Reading Panel (2000): systematic phonics improves early decoding.
   *   https://www.nichd.nih.gov/sites/default/files/publications/pubs/nrp/Documents/report.pdf
   * - IES WWC Foundational Skills (2016): explicit, systematic foundational-skills practice.
   *   https://ies.ed.gov/ncee/wwc/Docs/practiceguide/foundational_skills_pg_111516.pdf
   * - CCSS RF.K-2: progression from CVC to complex vowel patterns and multisyllable decoding.
   *   https://www.thecorestandards.org/ELA-Literacy/RF/K/3/
   *   https://www.thecorestandards.org/ELA-Literacy/RF/1/3/
   *   https://www.thecorestandards.org/ELA-Literacy/RF/2/3/
   */
  missingLetterWords: readonly string[];
  wordPictureVocab: readonly PictureVocabularyItem[];
  wordToPictureChance: number;
}

export const READING_CURRICULUM: Record<ReadingLevel, ReadingLevelCurriculum> = {
  r0: {
    missingLetterWords: [
      'cat', 'bat', 'hat', 'rat', 'mat', 'sat', 'cap', 'map', 'tap', 'nap',
      'bag', 'tag', 'rag', 'wag', 'jam', 'yam', 'van', 'fan', 'man', 'pan',
      'bed', 'red', 'net', 'pet', 'set', 'pen', 'ten', 'web', 'jet', 'hen',
      'pig', 'dig', 'fig', 'big', 'lip', 'pin', 'sit', 'hit', 'kit', 'win',
      'dog', 'log', 'hop', 'mop', 'top', 'pot', 'hot', 'box', 'fox', 'rod',
      'bug', 'hug', 'mug', 'rug', 'sun', 'run', 'mud', 'tub', 'cup', 'bus',
      'cut', 'nut', 'gum', 'sum', 'can', 'kid', 'dad', 'mom', 'job', 'fog',
    ],
    wordPictureVocab: [
      { word: 'cat', imagePath: '/cards/shadow/shadow_sneaky_cat.webp' },
      { word: 'fox', imagePath: '/cards/fire/fire_flame_fox.webp' },
      { word: 'dog', imagePath: '/cards/fire/fire_lava_hound.webp' },
      { word: 'bat', imagePath: '/cards/shadow/shadow_bat_swarm.webp' },
      { word: 'ram', imagePath: '/cards/air/air_thunder_ram.webp' },
      { word: 'dove', imagePath: '/cards/air/air_temple_dove.webp' },
      { word: 'crab', imagePath: '/cards/water/water_shell_crab.webp' },
      { word: 'bear', imagePath: '/cards/earth/earth_boulder_bear.webp' },
      { word: 'wolf', imagePath: '/cards/shadow/shadow_shade_wolf.webp' },
      { word: 'bird', imagePath: '/cards/air/air_tempest_eagle.webp' },
    ],
    wordToPictureChance: 0.2,
  },
  r1: {
    missingLetterWords: [
      'ship', 'shop', 'shed', 'chin', 'chat', 'chop', 'thin', 'that', 'this', 'when',
      'whip', 'with', 'ring', 'sing', 'king', 'wing', 'bank', 'milk', 'hand', 'sand',
      'land', 'lamp', 'jump', 'frog', 'clap', 'flag', 'spin', 'trip', 'drum', 'crab',
      'step', 'snack', 'brush', 'block', 'clock', 'glad', 'slip', 'snap', 'swim', 'stop',
      'plan', 'clan', 'stamp', 'stomp', 'grip', 'drop', 'drip', 'grin', 'brag', 'fresh',
      'flash', 'smash', 'crunch', 'branch', 'lunch', 'bunch', 'chest', 'shut', 'wish', 'path',
      'bath', 'math', 'sock', 'rock', 'best', 'nest', 'belt', 'melt', 'vest', 'test',
    ],
    wordPictureVocab: [
      { word: 'crab', imagePath: '/cards/water/water_shell_crab.webp' },
      { word: 'shark', imagePath: '/cards/water/water_reef_shark.webp' },
      { word: 'whale', imagePath: '/cards/water/water_tidal_whale.webp' },
      { word: 'sprite', imagePath: '/cards/fire/fire_ember_sprite.webp' },
      { word: 'golem', imagePath: '/cards/fire/fire_magma_golem.webp' },
      { word: 'otter', imagePath: '/cards/water/water_river_otter.webp' },
      { word: 'eagle', imagePath: '/cards/air/air_tempest_eagle.webp' },
      { word: 'knight', imagePath: '/cards/shadow/shadow_ghost_knight.webp' },
      { word: 'angel', imagePath: '/cards/air/air_archangel.webp' },
      { word: 'dragon', imagePath: '/cards/fire/fire_dragon_whelp.webp' },
    ],
    wordToPictureChance: 0.25,
  },
  r2: {
    missingLetterWords: [
      'cake', 'bike', 'home', 'cube', 'seed', 'boat', 'rain', 'train', 'green', 'light',
      'float', 'coach', 'smile', 'stone', 'flame', 'brain', 'sweep', 'shout', 'paint', 'cloud',
      'beach', 'night', 'shine', 'grape', 'broom', 'spoon', 'drive', 'plane', 'queen', 'toast',
      'dream', 'team', 'clean', 'gleam', 'chair', 'stair', 'train', 'plain', 'snail', 'trail',
      'snow', 'glow', 'crow', 'blow', 'cheep', 'sheep', 'sleep', 'steam', 'float', 'throat',
      'phone', 'rope', 'note', 'flute', 'brave', 'shape', 'spike', 'price', 'frame', 'flame',
      'goat', 'coat', 'road', 'toad', 'grain', 'chain', 'sprain', 'clean', 'treat', 'peach',
    ],
    wordPictureVocab: [
      { word: 'dragon', imagePath: '/cards/fire/fire_inferno_dragon.webp' },
      { word: 'turtle', imagePath: '/cards/water/water_storm_turtle.webp' },
      { word: 'serpent', imagePath: '/cards/water/water_frost_serpent.webp' },
      { word: 'eagle', imagePath: '/cards/air/air_tempest_eagle.webp' },
      { word: 'angel', imagePath: '/cards/air/air_seraph.webp' },
      { word: 'dinosaur', imagePath: '/cards/earth/earth_tyrant_rex.webp' },
      { word: 'wizard', imagePath: '/cards/air/air_acolyte.webp' },
      { word: 'vampire', imagePath: '/cards/shadow/shadow_vampire_lord.webp' },
      { word: 'kraken', imagePath: '/cards/water/water_kraken.webp' },
      { word: 'pteranodon', imagePath: '/cards/earth/earth_pteranodon.webp' },
    ],
    wordToPictureChance: 0.3,
  },
  r3: {
    missingLetterWords: [
      'basket', 'planet', 'picnic', 'rabbit', 'rocket', 'window', 'garden', 'number', 'problem', 'moment',
      'animal', 'candle', 'button', 'orange', 'inside', 'winter', 'summer', 'thunder', 'market', 'pencil',
      'camera', 'vacuum', 'napkin', 'ticket', 'blanket', 'captain', 'harvest', 'lantern', 'magnet', 'sunset',
      'sunlight', 'baseball', 'bedroom', 'backpack', 'playground', 'farmhouse', 'weekday', 'birthday', 'rainbow', 'cowboy',
      'helper', 'teacher', 'runner', 'jumper', 'kindness', 'careless', 'hopeful', 'fearless', 'replay', 'untie',
      'undo', 'unzip', 'misfit', 'mismatch', 'tablet', 'music', 'dinner', 'starter', 'quickly', 'slowly',
      'careful', 'fearful', 'joyful', 'painted', 'jumping', 'resting', 'camping', 'helping', 'reading', 'writing',
    ],
    wordPictureVocab: [
      { word: 'guardian', imagePath: '/cards/fire/fire_forge_guardian.webp' },
      { word: 'leviathan', imagePath: '/cards/water/water_depth_leviathan.webp' },
      { word: 'angelic', imagePath: '/cards/air/air_angelic_scribe.webp' },
      { word: 'priestess', imagePath: '/cards/air/air_priestess_of_light.webp' },
      { word: 'raptor', imagePath: '/cards/earth/earth_raptor.webp' },
      { word: 'stegosaurus', imagePath: '/cards/earth/earth_stegosaurus.webp' },
      { word: 'sentinel', imagePath: '/cards/shadow/shadow_bone_sentinel.webp' },
      { word: 'champion', imagePath: '/avatar/elemental_champion.webp' },
      { word: 'alchemist', imagePath: '/avatar/air_alchemist.webp' },
      { word: 'trickster', imagePath: '/avatar/shadow_trickster.webp' },
    ],
    wordToPictureChance: 0.35,
  },
};
