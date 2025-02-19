export enum TerrainType {
  PLAIN = 0,
  FOREST = 1,
  HILL = 2,
  SWAMP = 3,
  MOUNTAIN = 4, // IMPASSABLE
  WATER = 5    // typically IMPASSABLE - could be traversed by flying units and swimming units?
}

// Also export the terrain default movement costs
export const TERRAIN_COST: number[] = [1, 2, 3, 4, 10, 10, 100];
