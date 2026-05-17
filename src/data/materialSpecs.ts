// TODO: Verify station specializations against current in-game values before Phase 2.
// Some stations give a yield bonus for specific ores.
export interface StationSpecialization {
  stationId: string
  oreType: string
  yieldBonus: number  // additive bonus, e.g. 0.05 = +5%
}

export const STATION_SPECIALIZATIONS: StationSpecialization[] = [
  // Placeholder — fill from in-game data before Phase 2
]
