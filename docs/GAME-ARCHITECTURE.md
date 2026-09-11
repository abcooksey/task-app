# Game Architecture

## Overview

Phase 2 adds a Phaser 3 game embedded in a React component. This document defines the integration pattern, state ownership, and event contract.

---

## 1. Engine Choice

**Phaser 3.80+** (stable release)

```bash
npm install phaser@^3.80
```

Key configuration:
```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 360,
  height: 640,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [HouseScene],
};
```

---

## 2. Division of Responsibility

### Hard Rule: React Owns State, Phaser Only Renders

| Concern | Owner | Never |
|---------|-------|-------|
| Balance, repairs, settings | React + Supabase | Phaser never reads DB |
| Which repairs are complete | React (derived state) | Phaser never stores this |
| Selected hotspot | React | — |
| Affordability logic | React | Phaser never calculates |
| HUD, panels, toasts, sheets | React DOM | No Phaser text/buttons |
| Canvas rendering | Phaser | — |
| Input on canvas (hotspots) | Phaser | React handles the response |
| Animations | Phaser | — |

**Why:** React's state management (TanStack Query) handles caching, optimistic updates, and persistence. Phaser is a rendering engine, not a state container. Mixing them creates bugs.

---

## 3. React ↔ Phaser Event Bridge

### Implementation: `src/game/bridge.ts`

A tiny typed event emitter with no external dependencies:

```typescript
type BridgeEvents = {
  // React → Phaser (commands)
  setView: { view: 'exterior' | 'interior' };
  setHouseState: { state: HouseState };
  playRepair: { repairId: string };
  setReducedMotion: { enabled: boolean };
  setSelected: { repairId: string | null };

  // Phaser → React (events)
  ready: {};
  hotspotTapped: { repairId: string };
  repairAnimationDone: { repairId: string };
  viewReady: { view: 'exterior' | 'interior' };
};

class GameBridge {
  private listeners = new Map<string, Set<Function>>();

  emit<K extends keyof BridgeEvents>(event: K, data: BridgeEvents[K]) {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  on<K extends keyof BridgeEvents>(
    event: K,
    callback: (data: BridgeEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  clear() {
    this.listeners.clear();
  }
}

export const bridge = new GameBridge();
```

### Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Side                               │
├─────────────────────────────────────────────────────────────────┤
│  HouseGame.tsx                                                  │
│    ├── useHouseState() → subscribes to Supabase                │
│    ├── on state change → bridge.emit('setHouseState', state)   │
│    ├── bridge.on('hotspotTapped') → open sheet                 │
│    ├── bridge.on('repairAnimationDone') → show toast           │
│    └── renders: HUD, sheets, toasts as React DOM               │
└─────────────────────────────────────────────────────────────────┘
                              │
                     bridge.ts (events)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        Phaser Side                               │
├─────────────────────────────────────────────────────────────────┤
│  HouseScene.ts                                                  │
│    ├── bridge.on('setHouseState') → re-render sprites          │
│    ├── bridge.on('setView') → switch scene content             │
│    ├── bridge.on('playRepair') → run animation                 │
│    ├── on hotspot click → bridge.emit('hotspotTapped', id)     │
│    └── on anim complete → bridge.emit('repairAnimationDone')   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. React Component Structure

### `src/game/HouseGame.tsx`

```typescript
export default function HouseGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: houseState } = useHouseState();
  const { data: settings } = useSettings();
  const [selectedRepair, setSelectedRepair] = useState<string | null>(null);

  // Mount/destroy Phaser
  useEffect(() => {
    if (!containerRef.current) return;

    gameRef.current = new Phaser.Game({
      ...config,
      parent: containerRef.current,
    });

    return () => {
      bridge.clear();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Push state to Phaser
  useEffect(() => {
    if (houseState) {
      bridge.emit('setHouseState', { state: houseState });
    }
  }, [houseState]);

  // Listen for hotspot taps
  useEffect(() => {
    return bridge.on('hotspotTapped', ({ repairId }) => {
      setSelectedRepair(repairId);
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Phaser canvas */}
      <div ref={containerRef} id="game-container" className="w-full h-full" />

      {/* React overlays */}
      <HouseHUD balance={balance} progress={houseState?.progress} />

      {selectedRepair && (
        <RepairSheet
          repairId={selectedRepair}
          onClose={() => setSelectedRepair(null)}
        />
      )}
    </div>
  );
}
```

---

## 5. Phaser Scene Structure

### `src/game/scenes/HouseScene.ts`

```typescript
export class HouseScene extends Phaser.Scene {
  private composer: SceneComposer;
  private currentView: 'interior' | 'exterior' = 'interior';
  private houseState: HouseState | null = null;

  create() {
    this.composer = new SceneComposer(this);

    // Listen to bridge commands
    bridge.on('setHouseState', ({ state }) => {
      this.houseState = state;
      this.renderScene();
    });

    bridge.on('setView', ({ view }) => {
      this.currentView = view;
      this.renderScene();
      bridge.emit('viewReady', { view });
    });

    bridge.on('playRepair', ({ repairId }) => {
      this.playRepairAnimation(repairId);
    });

    bridge.emit('ready', {});
  }

  private renderScene() {
    this.composer.clear();

    const repairs = getRepairsForView(this.currentView);

    for (const repair of repairs) {
      const isCompleted = this.houseState?.completedRepairIds.has(repair.id);
      const textureKey = isCompleted ? repair.after : repair.before;

      this.composer.add({
        textureKey,
        x: repair.hotspot.x,
        y: repair.hotspot.y,
        layer: repair.layer,
      });

      if (!isCompleted) {
        this.createHotspot(repair);
      }
    }

    this.composer.render();
  }

  private createHotspot(repair: Repair) {
    const zone = this.add.zone(
      repair.hotspot.x + repair.hotspot.w / 2,
      repair.hotspot.y + repair.hotspot.h / 2,
      repair.hotspot.w,
      repair.hotspot.h
    );

    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      bridge.emit('hotspotTapped', { repairId: repair.id });
    });

    // Pulsing highlight (disabled under reduced motion)
    if (!this.reducedMotion) {
      this.createPulseEffect(zone, repair);
    }
  }

  private playRepairAnimation(repairId: string) {
    const repair = getRepairById(repairId);
    // Play animation based on repair.anim type
    // On complete:
    bridge.emit('repairAnimationDone', { repairId });
  }
}
```

---

## 6. SceneComposer

Handles layered rendering for repairs (and future furniture).

```typescript
interface ComposerItem {
  textureKey: string;
  x: number;
  y: number;
  layer: 'back' | 'mid' | 'front';
}

class SceneComposer {
  private items: ComposerItem[] = [];
  private sprites: Phaser.GameObjects.Sprite[] = [];

  constructor(private scene: Phaser.Scene) {}

  add(item: ComposerItem) {
    this.items.push(item);
  }

  clear() {
    this.sprites.forEach(s => s.destroy());
    this.sprites = [];
    this.items = [];
  }

  render() {
    // Sort by layer order: back → mid → front
    const layerOrder = { back: 0, mid: 1, front: 2 };
    this.items.sort((a, b) => layerOrder[a.layer] - layerOrder[b.layer]);

    for (const item of this.items) {
      const sprite = this.scene.add.sprite(item.x, item.y, item.textureKey);
      sprite.setOrigin(0, 0);
      this.sprites.push(sprite);
    }
  }
}
```

---

## 7. Placeholder Mode

For development without art assets:

```typescript
// In manifest.json
{
  "textures": [
    {
      "key": "int_floor_before",
      "path": "assets/repairs/int_floor_before.png",
      "placeholder": { "color": "#8B4513", "label": "BROKEN FLOOR" }
    }
  ]
}

// In preload
if (config.usePlaceholderArt) {
  // Generate colored rectangles with labels
  this.generatePlaceholder(entry.key, entry.placeholder);
} else {
  this.load.image(entry.key, entry.path);
}
```

---

## 8. Lifecycle

### Mount
1. React route `/home` renders `HouseGame`
2. `useEffect` creates `Phaser.Game` instance
3. Scene `create()` registers bridge listeners
4. Scene emits `ready`
5. React pushes current `houseState` via bridge
6. Scene renders

### Unmount
1. React route changes away from `/home`
2. `useEffect` cleanup runs
3. `bridge.clear()` removes all listeners
4. `game.destroy(true)` destroys Phaser instance
5. No references remain (verified: 20 navigations, no memory leak)

### State Update
1. Task completed → coin balance changes
2. TanStack Query refetches house state
3. React pushes new state via `bridge.emit('setHouseState')`
4. Phaser re-renders scene (idempotent)

---

## 9. Accessibility

- All interactive UI (sheets, buttons, lists) is React DOM, not Phaser
- "All repairs" list mirrors canvas hotspots for keyboard users
- Selecting list item → `bridge.emit('setSelected', { repairId })`
- Phaser highlights the hotspot visually
- Reduced motion setting disables all Phaser animations

---

## 10. Testing Strategy

| What | How |
|------|-----|
| Bridge events | Unit test: emit/on/clear |
| deriveHouseState | Unit test: all combinations |
| SceneComposer | Unit test: layer ordering |
| Repair RPC | Integration test: Supabase |
| Full loop | Playwright: tap hotspot → verify ledger row |
| Memory leaks | Manual: 20 navigations, DevTools heap snapshot |
