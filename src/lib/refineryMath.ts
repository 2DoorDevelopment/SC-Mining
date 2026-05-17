export function calcRefinedAmount(
  rawAmount: number,
  oreBaseYield: number,
  methodYieldMultiplier: number,
  stationSpecYieldBonus: number,
): number {
  return rawAmount * oreBaseYield * methodYieldMultiplier * (1 + stationSpecYieldBonus)
}

export function calcRefineryCost(
  rawAmount: number,
  oreBaseCost: number,
  methodCostMultiplier: number,
  stationCapacityModifier: number,
): number {
  return rawAmount * oreBaseCost * methodCostMultiplier * stationCapacityModifier
}

export function calcRefineryTime(
  rawAmount: number,
  oreBaseTime: number,
  methodSpeedMultiplier: number,
  stationCapacityModifier: number,
): number {
  return rawAmount * oreBaseTime * methodSpeedMultiplier * stationCapacityModifier
}

export function calcGrossSale(refinedAmount: number, sellPricePerUnit: number): number {
  return refinedAmount * sellPricePerUnit
}

export function calcNetProfit(grossSale: number, refineryCost: number): number {
  return grossSale - refineryCost
}

interface CrewMember {
  memberId: string
  shares: number
  bonusAUEC: number
}

interface WorkOrder {
  finalSalePrice: number | null
  quotedCost: number
  status: string
}

export function calcPayoutSplits(
  workOrders: WorkOrder[],
  crewMembers: CrewMember[],
): Array<{ memberId: string; shares: number; bonusAUEC: number; amount: number }> {
  const soldOrders = workOrders.filter((o) => o.status === 'sold')
  const totalGross = soldOrders.reduce((sum, o) => sum + (o.finalSalePrice ?? 0), 0)
  const totalExpenses = soldOrders.reduce((sum, o) => sum + o.quotedCost, 0)
  const totalNet = totalGross - totalExpenses

  const totalBonuses = crewMembers.reduce((sum, m) => sum + m.bonusAUEC, 0)
  const totalShares = crewMembers.reduce((sum, m) => sum + m.shares, 0)
  const poolAfterBonuses = totalNet - totalBonuses

  return crewMembers.map((m) => ({
    memberId: m.memberId,
    shares: m.shares,
    bonusAUEC: m.bonusAUEC,
    amount: m.bonusAUEC + (totalShares > 0 ? poolAfterBonuses * (m.shares / totalShares) : 0),
  }))
}
