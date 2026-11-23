import { CreatureType } from '../battle/creature';
import {
  AgricultureOption,
  createEmptyResourcePool,
  DefenseStructureTier,
  OverviewArmy,
  OverviewHex,
  OverviewPlayer,
  OverviewResourceType,
  RegionState,
  ResourcePool,
  SettlementTier,
} from './overview-types';

export const POPULATION_SOFT_CAP = 2500;
export const POPULATION_HARD_CAP = 4999;
export const MAX_SQUADS_PER_ARMY = 8;

const DEFENSE_TAX_MULTIPLIER: Record<DefenseStructureTier, number> = {
  none: 1.0,
  palisade: 1.15,
  keep: 1.35,
  castle: 1.6,
};

const SETTLEMENT_BASE_TAX: Record<SettlementTier, number> = {
  village: 25,
  town: 50,
  city: 85,
};

export interface RecruitUnitCost {
  creatureType: CreatureType;
  label: string;
  money: number;
  lumber: number;
  iron: number;
  horses: number;
  populationCost: number;
  defaultCount: number;
}

export const RECRUITABLE_UNITS: RecruitUnitCost[] = [
  {
    creatureType: CreatureType.PEASANT,
    label: 'Peasant',
    money: 20,
    lumber: 0,
    iron: 0,
    horses: 0,
    populationCost: 25,
    defaultCount: 12,
  },
  {
    creatureType: CreatureType.SPEARMAN,
    label: 'Spearman',
    money: 45,
    lumber: 4,
    iron: 4,
    horses: 0,
    populationCost: 25,
    defaultCount: 8,
  },
  {
    creatureType: CreatureType.SWORDSMAN,
    label: 'Swordsman',
    money: 65,
    lumber: 0,
    iron: 8,
    horses: 0,
    populationCost: 25,
    defaultCount: 8,
  },
  {
    creatureType: CreatureType.PEASANT_ARCHER,
    label: 'Archer',
    money: 40,
    lumber: 8,
    iron: 2,
    horses: 0,
    populationCost: 25,
    defaultCount: 8,
  },
];

export const MERCHANT_PRICES: Record<Exclude<OverviewResourceType, 'money'>, { buy: number; sell: number }> = {
  food: { buy: 3, sell: 2 },
  lumber: { buy: 6, sell: 4 },
  stone: { buy: 7, sell: 5 },
  iron: { buy: 10, sell: 7 },
  grain: { buy: 3, sell: 2 },
  sheep: { buy: 5, sell: 3 },
  cattle: { buy: 7, sell: 5 },
  horses: { buy: 14, sell: 9 },
};

export function getDefenseTaxMultiplier(tier: DefenseStructureTier): number {
  return DEFENSE_TAX_MULTIPLIER[tier] ?? 1.0;
}

export function getMaxWorkforce(region: RegionState): number {
  return Math.max(1, Math.floor(region.population / 50));
}

export function getTotalAssignedWorkers(regionHexes: OverviewHex[]): number {
  return regionHexes.reduce((sum, hex) => sum + (hex.assignedWorkers || 0), 0);
}

/**
 * Computes next-turn population for a region:
 * - Fast percentage growth at low populations (up to ~18% per turn).
 * - Severely damped around POPULATION_SOFT_CAP (2500).
 * - Strictly capped below 5000 (POPULATION_HARD_CAP = 4999) regardless of buffs.
 */
export function calculateNextPopulation(
  currentPop: number,
  foodAvailable: number,
  taxRate: number = 1.0,
  settlementTier: SettlementTier = 'village',
  buffMultiplier: number = 1.0
): number {
  const clampedCurrent = Math.max(50, Math.min(POPULATION_HARD_CAP, Math.floor(currentPop)));
  const foodRequired = Math.max(5, Math.ceil(clampedCurrent / 100));

  if (foodAvailable < foodRequired) {
    const deficitRatio = (foodRequired - foodAvailable) / foodRequired;
    const loss = Math.max(5, Math.floor(clampedCurrent * (0.04 + 0.1 * deficitRatio)));
    return Math.max(50, clampedCurrent - loss);
  }

  const tierBonus = settlementTier === 'city' ? 1.15 : settlementTier === 'town' ? 1.05 : 1.0;
  const taxFactor = Math.max(0.4, 1.2 - taxRate * 0.25);

  let growthRate: number;
  if (clampedCurrent < POPULATION_SOFT_CAP) {
    // High % growth at low pop, tapering sharply as pop approaches 2500
    const roomToSoftCap = Math.max(0, 1 - clampedCurrent / POPULATION_SOFT_CAP);
    growthRate = 0.18 * Math.pow(roomToSoftCap, 1.75) + 0.002;
  } else {
    // Extremely nerfed above 2500, asymptotically approaching 4999
    const roomToHardCap = Math.max(0, 1 - clampedCurrent / POPULATION_HARD_CAP);
    growthRate = 0.004 * Math.pow(roomToHardCap, 2.0);
  }

  const delta = Math.max(
    clampedCurrent >= POPULATION_HARD_CAP ? 0 : 1,
    Math.floor(clampedCurrent * growthRate * tierBonus * taxFactor * Math.max(0.5, buffMultiplier))
  );

  return Math.min(POPULATION_HARD_CAP, clampedCurrent + delta);
}

export interface RegionTurnEconomyResult {
  produced: ResourcePool;
  foodConsumed: number;
  netFood: number;
}

export function calculateRegionTurnEconomy(
  region: RegionState,
  regionHexes: OverviewHex[]
): RegionTurnEconomyResult {
  const produced = createEmptyResourcePool();
  if (!region.settlementTier) {
    return { produced, foodConsumed: 0, netFood: 0 };
  }

  const popTaxFactor = Math.max(0.5, region.population / 500);
  const baseTax = SETTLEMENT_BASE_TAX[region.settlementTier] ?? 25;
  const taxMoney = Math.round(
    baseTax * popTaxFactor * region.taxRate * getDefenseTaxMultiplier(region.defenseTier)
  );
  produced.money += taxMoney;

  for (const hex of regionHexes) {
    const workers = Math.max(0, hex.assignedWorkers || 0);
    if (workers <= 0) continue;

    switch (hex.resourceBuilding) {
      case 'lumber_camp':
        produced.lumber += workers * 4;
        break;
      case 'quarry':
        produced.stone += workers * 3;
        break;
      case 'iron_mine':
        produced.iron += workers * 3;
        break;
      case 'gold_mine':
        produced.money += workers * 15;
        break;
    }

    if (hex.isAgriculturalPlot) {
      switch (hex.agricultureOption) {
        case 'wheat':
          produced.grain += workers * 6;
          produced.food += workers * 6;
          break;
        case 'cattle':
          produced.cattle += workers * 3;
          produced.food += workers * 7;
          break;
        case 'sheep':
          produced.sheep += workers * 3;
          produced.food += workers * 5;
          break;
        case 'horses':
          produced.horses += workers * 2;
          break;
      }
    }
  }

  const foodConsumed = Math.max(5, Math.ceil(region.population / 100));
  return {
    produced,
    foodConsumed,
    netFood: produced.food - foodConsumed,
  };
}

export function assignWorkersToHex(
  region: RegionState,
  regionHexes: OverviewHex[],
  targetHex: OverviewHex,
  delta: number
): boolean {
  if (!targetHex.resourceBuilding && !targetHex.isAgriculturalPlot) {
    return false;
  }
  const maxWorkforce = getMaxWorkforce(region);
  const currentTotal = getTotalAssignedWorkers(regionHexes);
  const nextWorkers = targetHex.assignedWorkers + delta;

  if (nextWorkers < 0) return false;
  if (delta > 0 && currentTotal + delta > maxWorkforce) return false;

  targetHex.assignedWorkers = nextWorkers;
  return true;
}

export function setHexAgricultureOption(
  targetHex: OverviewHex,
  option: AgricultureOption
): boolean {
  if (!targetHex.isAgriculturalPlot) return false;
  targetHex.agricultureOption = option;
  return true;
}

export function tradeWithMerchant(
  player: OverviewPlayer,
  resource: Exclude<OverviewResourceType, 'money'>,
  amount: number,
  action: 'buy' | 'sell'
): boolean {
  if (amount <= 0 || !Number.isFinite(amount)) return false;
  const qty = Math.floor(amount);
  const price = MERCHANT_PRICES[resource];
  if (!price) return false;

  if (action === 'buy') {
    const totalCost = qty * price.buy;
    if (player.resources.money < totalCost) return false;
    player.resources.money -= totalCost;
    player.resources[resource] += qty;
    return true;
  }

  if (player.resources[resource] < qty) return false;
  player.resources[resource] -= qty;
  player.resources.money += qty * price.sell;
  return true;
}

export function recruitSquad(
  player: OverviewPlayer,
  region: RegionState,
  creatureType: CreatureType,
  army: OverviewArmy
): boolean {
  if (region.ownerPlayerId !== player.id) return false;
  if (army.ownerPlayerId !== player.id) return false;
  if (army.squads.length >= MAX_SQUADS_PER_ARMY) return false;

  const unitDef = RECRUITABLE_UNITS.find((u) => u.creatureType === creatureType);
  if (!unitDef) return false;

  if (
    player.resources.money < unitDef.money ||
    player.resources.lumber < unitDef.lumber ||
    player.resources.iron < unitDef.iron ||
    player.resources.horses < unitDef.horses ||
    region.population - unitDef.populationCost < 50
  ) {
    return false;
  }

  player.resources.money -= unitDef.money;
  player.resources.lumber -= unitDef.lumber;
  player.resources.iron -= unitDef.iron;
  player.resources.horses -= unitDef.horses;
  region.population -= unitDef.populationCost;

  army.squads.push({
    creatureType: unitDef.creatureType,
    count: unitDef.defaultCount,
    hpPercent: 1.0,
  });
  return true;
}

export interface DefenseUpgradeCost {
  nextTier: DefenseStructureTier;
  money: number;
  lumber: number;
  stone: number;
  iron: number;
}

export const DEFENSE_UPGRADE_COSTS: Partial<Record<DefenseStructureTier, DefenseUpgradeCost>> = {
  none: { nextTier: 'palisade', money: 80, lumber: 20, stone: 0, iron: 0 },
  palisade: { nextTier: 'keep', money: 160, lumber: 15, stone: 25, iron: 5 },
  keep: { nextTier: 'castle', money: 300, lumber: 20, stone: 50, iron: 15 },
};

export function upgradeDefenseStructure(
  player: OverviewPlayer,
  region: RegionState
): boolean {
  if (region.ownerPlayerId !== player.id) return false;
  const cost = DEFENSE_UPGRADE_COSTS[region.defenseTier];
  if (!cost) return false;

  if (
    player.resources.money < cost.money ||
    player.resources.lumber < cost.lumber ||
    player.resources.stone < cost.stone ||
    player.resources.iron < cost.iron
  ) {
    return false;
  }

  player.resources.money -= cost.money;
  player.resources.lumber -= cost.lumber;
  player.resources.stone -= cost.stone;
  player.resources.iron -= cost.iron;
  region.defenseTier = cost.nextTier;
  return true;
}
