// TODO: Verify multipliers against current in-game values before Phase 2 goes live.
// Source: Regolith.Rocks + TEST Squadron refinery guide (4.0 patch).
export interface RefineryMethod {
  id: string
  name: string
  yieldMultiplier: number  // multiplier on refined output
  costMultiplier: number   // multiplier on refinery fee
  speedMultiplier: number  // multiplier on refinery time (>1 = slower)
  description: string
}

export const REFINERY_METHODS: RefineryMethod[] = [
  {
    id: 'dinyx-solventation',
    name: 'Dinyx Solventation',
    yieldMultiplier: 1.25,
    costMultiplier: 1.35,
    speedMultiplier: 1.5,
    description: 'High yield, high cost, slow',
  },
  {
    id: 'cormack',
    name: 'Cormack Method',
    yieldMultiplier: 1.0,
    costMultiplier: 1.0,
    speedMultiplier: 1.0,
    description: 'Baseline method',
  },
  {
    id: 'ferron-exchange',
    name: 'Ferron Exchange',
    yieldMultiplier: 0.9,
    costMultiplier: 0.75,
    speedMultiplier: 0.85,
    description: 'Lower yield, cheaper, faster',
  },
  {
    id: 'pyrometric-cycling',
    name: 'Pyrometric Cycling',
    yieldMultiplier: 1.1,
    costMultiplier: 0.9,
    speedMultiplier: 1.2,
    description: 'Slightly better yield, cheaper but slower',
  },
  {
    id: 'electrostaric',
    name: 'Electrostaric',
    yieldMultiplier: 1.15,
    costMultiplier: 1.1,
    speedMultiplier: 0.9,
    description: 'Good yield, moderate cost, fast',
  },
  {
    id: 'thersa',
    name: 'Thersa Method',
    yieldMultiplier: 0.95,
    costMultiplier: 0.6,
    speedMultiplier: 0.7,
    description: 'Lowest cost, fastest, lower yield',
  },
  {
    id: 'xcrtanite',
    name: 'XCRTanite',
    yieldMultiplier: 1.2,
    costMultiplier: 1.5,
    speedMultiplier: 2.0,
    description: 'Best yield, most expensive, very slow',
  },
]
