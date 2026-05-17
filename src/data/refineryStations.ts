export interface RefineryStation {
  id: string
  name: string
  system: string
  location: string
}

export const REFINERY_STATIONS: RefineryStation[] = [
  { id: 'ARC-L1', name: 'ARC-L1 Wide Forest Station', system: 'Stanton', location: 'ArcCorp L1' },
  { id: 'ARC-L2', name: 'ARC-L2 Lively Pathway Station', system: 'Stanton', location: 'ArcCorp L2' },
  { id: 'HUR-L1', name: 'HUR-L1 Green Glade Station', system: 'Stanton', location: 'Hurston L1' },
  { id: 'HUR-L2', name: 'HUR-L2 Faithful Dream Station', system: 'Stanton', location: 'Hurston L2' },
  { id: 'MIC-L1', name: 'MIC-L1 Shallow Frontier Station', system: 'Stanton', location: 'microTech L1' },
  { id: 'MIC-L2', name: 'MIC-L2 Long Forest Station', system: 'Stanton', location: 'microTech L2' },
  { id: 'CRU-L1', name: 'CRU-L1 Ambitious Dream Station', system: 'Stanton', location: 'Crusader L1' },
  { id: 'PYRO-L1', name: 'Pyro Gateway Station', system: 'Pyro', location: 'Pyro L1' },
]
