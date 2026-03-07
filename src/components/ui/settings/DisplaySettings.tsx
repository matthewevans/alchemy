import { usePreferencesStore, DEFAULT_UI_SCALE, DEFAULT_BOARD_SCALE } from '@game/preferencesStore';
import type { StatLayout, VfxLevel } from '@game/preferencesStore';
import { BATTLEFIELDS } from '@components/board/battlefields';
import { SettingsSlider, SettingsToggle, SettingsSelect } from './SettingsControls';

const BATTLEFIELD_OPTIONS = [
  { value: 'auto', label: 'Auto (match deck)' },
  ...BATTLEFIELDS.map((b) => ({ value: b.id, label: b.label })),
];

const VFX_LEVEL_OPTIONS = [
  { value: 'full', label: 'Full (particles + element overlays)' },
  { value: 'reduced', label: 'Reduced (particles only)' },
  { value: 'minimal', label: 'Minimal (numbers only)' },
];

const STAT_LAYOUT_OPTIONS = [
  { value: 'center', label: 'Centered' },
  { value: 'right', label: 'Right-aligned' },
  { value: 'spread', label: 'Split (classic)' },
];

export function DisplaySettings() {
  const {
    uiScale,
    setUIScale,
    resetUIScale,
    boardScale,
    setBoardScale,
    resetBoardScale,
    battlefieldAmbience,
    setBattlefieldAmbience,
    battlefield,
    setBattlefield,
    vfxLevel,
    setVfxLevel,
    statLayout,
    setStatLayout,
  } = usePreferencesStore();

  return (
    <>
      <SettingsSlider
        id="ui-scale"
        label="UI Scale"
        description="Scales hand cards and in-card text size."
        value={uiScale}
        displayValue={`${Math.round(uiScale * 100)}%`}
        min={0.6}
        max={1.4}
        step={0.05}
        accentColor="#fbbf24"
        onChange={setUIScale}
        onReset={resetUIScale}
        showReset={uiScale !== DEFAULT_UI_SCALE}
      />
      <SettingsSlider
        id="board-scale"
        label="Board Scale"
        description="Scales cards shown on the battlefield."
        value={boardScale}
        displayValue={`${Math.round(boardScale * 100)}%`}
        min={0.6}
        max={1.4}
        step={0.05}
        accentColor="#34d399"
        onChange={setBoardScale}
        onReset={resetBoardScale}
        showReset={boardScale !== DEFAULT_BOARD_SCALE}
      />
      <div className="w-full h-px bg-slate-600/30 my-1" />
      <SettingsSelect
        id="battlefield"
        label="Battlefield"
        description="Choose a board theme. Auto matches your deck's element."
        value={battlefield}
        options={BATTLEFIELD_OPTIONS}
        onChange={(v) => setBattlefield(v)}
      />
      <SettingsToggle
        id="battlefield-ambience"
        label="Ambient Particles"
        description="Shows animated ambient effects for the selected battlefield."
        checked={battlefieldAmbience}
        onChange={setBattlefieldAmbience}
      />
      <SettingsSelect
        id="vfx-level"
        label="Combat VFX"
        description="Controls combat visual effects: projectiles, explosions, and on-card element overlays."
        value={vfxLevel}
        options={VFX_LEVEL_OPTIONS}
        onChange={(v) => setVfxLevel(v as VfxLevel)}
      />
      <SettingsSelect
        id="stat-layout"
        label="Card Stats"
        description="Changes where attack and health are placed on creature cards."
        value={statLayout}
        options={STAT_LAYOUT_OPTIONS}
        onChange={(v) => setStatLayout(v as StatLayout)}
      />
    </>
  );
}
