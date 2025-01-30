import { Coords } from "./shared";

export class HexMapConfig {
  public OFFSET_X = 0;
  public OFFSET_Y = 0;
  public CELL_WIDTH = 80;
  public CELL_HEIGHT = 92;
}

export enum HexDirection {
  NONE = 0,
  EAST = 1,
  NORTHEAST = 2,
  NORTHWEST = 3,
  WEST = 4,
  SOUTHWEST = 5,
  SOUTHEAST = 6
}

export enum HexEdge {
  NONE = 0,
  EAST = 1,
  NORTHEAST = 2,
  NORTH_NORTHEAST = 3,
  NORTH = 4,
  NORTH_NORTHWEST = 5,
  NORTHWEST = 6,
  WEST = 7,
  SOUTHWEST = 8,
  SOUTH_SOUTHWEST = 9,
  SOUTH = 10,
  SOUTH_SOUTHEAST = 11,
  SOUTHEAST = 12
}

export enum HexFlankStatus {
  NONE = 0,
  FLANK = 1,
  BACKSTAB = 2
}

export function reverseDirection(direction: HexDirection): HexDirection {
  switch (direction) {
    case HexDirection.EAST:
      return HexDirection.WEST;
    case HexDirection.NORTHEAST:
      return HexDirection.SOUTHWEST;
    case HexDirection.NORTHWEST:
      return HexDirection.SOUTHEAST;
    case HexDirection.WEST:
      return HexDirection.EAST;
    case HexDirection.SOUTHWEST:
      return HexDirection.NORTHEAST;
    case HexDirection.SOUTHEAST:
      return HexDirection.NORTHWEST;
  }
  return HexDirection.NONE;
};

export function hexDirectionToString(direction: HexDirection): string {
  switch (direction) {
    case HexDirection.NONE:
      return "NONE";
    case HexDirection.EAST:
      return "EAST";
    case HexDirection.NORTHEAST:
      return "NORTHEAST";
    case HexDirection.NORTHWEST:
      return "NORTHWEST";
    case HexDirection.WEST:
      return "WEST";
    case HexDirection.SOUTHWEST:
      return "SOUTHWEST";
    case HexDirection.SOUTHEAST:
      return "SOUTHEAST";
    default:
      return "UNKNOWN";
  }
}

/**
* Checks whether the attacker attacks from a flanking direction.
* @param facingDir The direction that the unit is facing in.
* @param attackFromDir The direction from which the attack is coming from.
* @returns The flank status.
*/
export function checkFlankingStatus(facingDir: HexDirection, attackFromDir: HexDirection): HexFlankStatus {
  if (facingDir === HexDirection.NONE || attackFromDir === HexDirection.NONE) {
    return HexFlankStatus.NONE;
  }

  // Directions
  //     \ 3 |  2 /
  //      \/  \ /
  //    4 |   |  1
  //     /\  / \
  //   / 5 |  6 \
  // If the unit is facing direction 4 and
  // - the attack is coming from direction 2 or 6, it is a flanking attack.
  // - the attack is coming from direction 1, it is a backstab.
  // - the attack is coming from other directions, it is a normal attack.

  const relativeDir = (6 + attackFromDir - facingDir) % 6 + 1;
  if (relativeDir === 3 || relativeDir === 5) {
    return HexFlankStatus.FLANK;
  } else if (relativeDir === 4) {
    return HexFlankStatus.BACKSTAB;
  }

  return HexFlankStatus.NONE;
}


export class HexMap {

  static DEFAULT_HEX_MAP_CONFIG: HexMapConfig = {
    OFFSET_X: 0,
    OFFSET_Y: 0,
    CELL_WIDTH: 80,
    CELL_HEIGHT: 92
  };

  static INV_SQRT3: number = 1 / Math.sqrt(3);
  static SQRT3: number = Math.sqrt(3);


  public tiles: number[][] = [];

  public offset(): Coords { return { x: this.config.OFFSET_X, y: this.config.OFFSET_Y }; }
  public setOffset(x: number, y: number) { this.config.OFFSET_X = x; this.config.OFFSET_Y = y; }
  public cellSize(): Coords { return { x: this.config.CELL_WIDTH, y: this.config.CELL_HEIGHT }; }
  public setCellSize(size: number) { this.config.CELL_WIDTH = size; }

  constructor(public width: number, public height: number, private config: HexMapConfig = { ...HexMap.DEFAULT_HEX_MAP_CONFIG }) {

  }

  public initializeToSize(mapWidth: number, mapHeight: number) {
    for (let i = 0; i < mapWidth; i++) {
      this.tiles[i] = [];
      for (let j = 0; j < mapHeight; j++) {
        // get a random value between 1 and 5
        // Note: for the time being, just use this hardcoded value until more graphics are added
        let randomValue = 3;
        this.tiles[i][j] = randomValue;
      }
    }
  }

  /**
   * Get all the neighbours of a hexagon.
   * @param coords Starting hexagon coordinates.
   * @returns An array of coordinates of the neighbours.
   */
  public getNeighbours(coords: Coords): Coords[] {
    let result: Coords[] = [];
    for (let i = HexDirection.EAST; i <= HexDirection.SOUTHEAST; i++) {
      let neighbour = this.getNeighbourInDirection(coords, i);
      if (neighbour !== null) {
        result.push(neighbour);
      }
    }
    return result;
  }

  /**
   * Get all the neighbours of a hexagon.
   * @param coords Starting hexagon coordinates.
   * @returns An array of coordinates of the neighbours.
   */
  public static getNeighboursInBounds(coords: Coords, width: number, height: number): Coords[] {
    let result: Coords[] = [];
    for (let i = HexDirection.EAST; i <= HexDirection.SOUTHEAST; i++) {
      let neighbour = HexMap.getNeighbourInDirectionInBounds(coords, i, width, height);
      if (neighbour !== null) {
        result.push(neighbour);
      }
    }
    return result;
  }

  /**
   * Find a neighbour of a hexagon in a given direction (or null if the neighbour is outside the map).
   * @param coords Starting coordinates
   * @param direction The direction in which to find the neighbour
   * @returns The coordinates of the neighbour in the given direction, or null if the neighbour is outside the map.
   */
  public getNeighbourInDirection(coords: Coords, direction: HexDirection): Coords | null {
    return HexMap.getNeighbourInDirectionInBounds(coords, direction, this.width, this.height);
  }

  /**
   * Find a neighbour of a hexagon in a given direction (or null if the neighbour is outside the bounds).
   * @param coords Starting coordinates
   * @param direction The direction in which to find the neighbour
   * @param width Width of the map
   * @param height Height of the map
   * @returns The coordinates of the neighbour in the given direction, or null if the neighbour is outside the map.
   */
  public static getNeighbourInDirectionInBounds(coords: Coords, direction: HexDirection, width: number, height: number): Coords | null {
    let result = HexMap.getCoordsInDirectionInternal(coords, direction);
    if (result === null) return null;
    if (result.x < 0 || result.x >= width || result.y < 0 || result.y >= height) return null;
    return result;
  }

  public static getNeighbourInDirectionInDataMatrix(coords: Coords, direction: HexDirection, data: number[][], width: number, height: number): { coord: Coords, value: number } | null {
    let result = HexMap.getCoordsInDirectionInternal(coords, direction);
    if (result === null) return null;
    if (result.x < 0 || result.x >= width || result.y < 0 || result.y >= height) return null;
    return { coord: result, value: data[result.x][result.y] };
  }

  /**
   * Used in edge detection. Checks if the directions are free or null.
   * @param coords Starting coordinates.
   * @param dir1 Direction in which to find the neighbour.
   * @returns New coordinates in the given direction, or null if the direction is unrecognized.
   */
  private static are3DirectionsFreeOrNull(
    neighbours: Array<{ coord: Coords, value: number } | null>,
    dir1: HexDirection, dir2: HexDirection, dir3: HexDirection): boolean {
    if ((!neighbours[dir1] || neighbours[dir1].value < 1)
      && (!neighbours[dir2] || neighbours[dir2].value < 1)
      && (!neighbours[dir3] || neighbours[dir3].value < 1)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Used in edge detection. Checks if the directions are free or null.
   * @param coords Starting coordinates.
   * @param dir1 Direction in which to find the neighbour.
   * @returns New coordinates in the given direction, or null if the direction is unrecognized.
   */
  private static are2DirectionsFreeOrNull(
    neighbours: Array<{ coord: Coords, value: number } | null>,
    dir1: HexDirection, dir2: HexDirection): boolean {
    if ((!neighbours[dir1] || neighbours[dir1].value < 1)
      && (!neighbours[dir2] || neighbours[dir2].value < 1)
    ) {
      return true;
    }

    return false;
  }

  private static getSingleEdgeForDataCell(data: number[][], width: number, height: number, x: number, y: number): HexEdge {
    // check all neighbours
    let neighbours: Array<{ coord: Coords, value: number } | null> = [];
    for (let dir = HexDirection.EAST; dir <= HexDirection.SOUTHEAST; dir++) {
      const neighbour = HexMap.getNeighbourInDirectionInDataMatrix({ x, y }, dir, data, width, height);
      neighbours[dir] = neighbour;
    }

    let edgeDir = HexEdge.NORTH;
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.EAST, HexDirection.NORTHEAST, HexDirection.SOUTHEAST)) {
      return HexEdge.EAST;
    }
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.EAST, HexDirection.NORTHEAST, HexDirection.NORTHWEST)) {
      return HexEdge.NORTH_NORTHEAST;
    }
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.WEST, HexDirection.NORTHEAST, HexDirection.NORTHWEST)) {
      return HexEdge.NORTH_NORTHWEST;
    }
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.EAST, HexDirection.SOUTHEAST, HexDirection.SOUTHWEST)) {
      return HexEdge.SOUTH_SOUTHEAST;
    }
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.WEST, HexDirection.SOUTHEAST, HexDirection.SOUTHWEST)) {
      return HexEdge.SOUTH_SOUTHWEST;
    }
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.WEST, HexDirection.SOUTHEAST, HexDirection.SOUTHWEST)) {
      return HexEdge.SOUTH_SOUTHWEST;
    }
    if (HexMap.are3DirectionsFreeOrNull(neighbours, HexDirection.WEST, HexDirection.NORTHWEST, HexDirection.SOUTHWEST)) {
      return HexEdge.WEST;
    }

    if (HexMap.are2DirectionsFreeOrNull(neighbours, HexDirection.EAST, HexDirection.NORTHEAST)) {
      return HexEdge.NORTHEAST;
    }
    if (HexMap.are2DirectionsFreeOrNull(neighbours, HexDirection.EAST, HexDirection.SOUTHEAST)) {
      return HexEdge.SOUTHEAST;
    }
    if (HexMap.are2DirectionsFreeOrNull(neighbours, HexDirection.WEST, HexDirection.NORTHWEST)) {
      return HexEdge.NORTHWEST;
    }
    if (HexMap.are2DirectionsFreeOrNull(neighbours, HexDirection.WEST, HexDirection.SOUTHWEST)) {
      return HexEdge.SOUTHWEST;
    }
    if (HexMap.are2DirectionsFreeOrNull(neighbours, HexDirection.NORTHEAST, HexDirection.NORTHWEST)) {
      return HexEdge.NORTH;
    }
    if (HexMap.are2DirectionsFreeOrNull(neighbours, HexDirection.SOUTHEAST, HexDirection.SOUTHWEST)) {
      return HexEdge.SOUTH;
    }

    return edgeDir;
  }

  public static getEdgesForDataMatrix(data: number[][], width: number, height: number): { coord: Coords, value: number, edge: HexEdge }[] {

    let result: { coord: Coords, value: number, edge: HexEdge }[] = [];
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        // only take the border into account
        if (data[i][j] !== 1) {
          continue;
        }

        const edgeDir = HexMap.getSingleEdgeForDataCell(data, width, height, i, j);

        result.push({ coord: { x: i, y: j }, value: data[i][j], edge: edgeDir });
      }
    }
    return result;
  }

  /**
   * Find a neighbour of a hexagon in a given direction.
   * @param coords Starting coordinates.
   * @param direction Direction in which to find the neighbour.
   * @returns New coordinates in the given direction, or null if the direction is unrecognized.
   */
  private static getCoordsInDirectionInternal(coords: Coords, direction: HexDirection): Coords | null {
    switch (direction) {
      case HexDirection.EAST:
        return { x: coords.x + 1, y: coords.y };
      case HexDirection.NORTHEAST:
        return { x: coords.x + (coords.y % 2), y: coords.y - 1 };
      case HexDirection.NORTHWEST:
        return { x: coords.x - (1 - coords.y % 2), y: coords.y - 1 };
      case HexDirection.WEST:
        return { x: coords.x - 1, y: coords.y };
      case HexDirection.SOUTHWEST:
        return { x: coords.x - (1 - coords.y % 2), y: coords.y + 1 };
      case HexDirection.SOUTHEAST:
        return { x: coords.x + (coords.y % 2), y: coords.y + 1 };
      default:
        return null;
    }
  }

  /**
   * Transforms the hexagon coordinates from matrix representation to pixel representation.
   * Note: The hexagon is assumed to be oriented with one of its corners pointing up.
   * 
   * @param q X coordinate of the hexagon in matrix representation
   * @param r Y coordinate of the hexagon in matrix representation
   * @returns The center of the hexagon in pixel coordinates
   */
  public hexToPixel(q: number, r: number): Coords {
    const cellSize = this.config.CELL_WIDTH * HexMap.INV_SQRT3;
    let x = this.config.OFFSET_X + cellSize * (HexMap.SQRT3 * q + HexMap.SQRT3 / 2 * r);
    let y = this.config.OFFSET_Y + cellSize * (3.0 / 2 * r);

    // Adjust the horizontal position.
    // {0, 0} => {0, 0}
    //  {0, 1} => {0, 1}
    // {0, 2} => {1, 2}
    //  {0, 3} => {1, 3}
    // {0, 4} => {2, 4}
    x -= Math.floor(r / 2) * this.config.CELL_WIDTH;

    return { x, y };
  }


  /**
   * Transforms the pixel coordinates to hexagon coordinates.
   * @param x X coordinate of the pixel.
   * @param y Y coordinate of the pixel.
   * @returns The hexagon coordinates in matrix representation.
   */
  public pixelToHex(x: number, y: number): Coords {
    return HexMap.pixelToHexInternal(x, y, this.config.OFFSET_X, this.config.OFFSET_Y, this.config.CELL_WIDTH);
  }

  /**
   * Transforms the pixel coordinates to hexagon coordinates.
   * @param x X coordinate of the pixel.
   * @param y Y coordinate of the pixel.
   * @returns The hexagon coordinates in matrix representation.
   */
  static pixelToHexInternal(x: number, y: number, offset_x: number, offset_y: number, cell_width: number): Coords {
    let coordsWithoutOffset: Coords = { x: x - offset_x, y: y - offset_y };
    const cellSize = cell_width * HexMap.INV_SQRT3;

    let q = (coordsWithoutOffset.x * HexMap.SQRT3 / 3 - coordsWithoutOffset.y / 3) / cellSize;
    let r = coordsWithoutOffset.y * 2 / 3 / cellSize;

    let result = HexMap.axial_round(q, r);

    // Adjust the horizontal position for lines with odd r, the q is shifted by half a cell to the right
    // {0, 0} => {0, 0}
    //  {0, 1} => {0, 1}
    // {0, 2} => {1, 2}
    //  {0, 3} => {1, 3}
    // {0, 4} => {2, 4}
    result.x += Math.floor(result.y / 2);

    return result;
  }

  static axial_round = (x: number, y: number): Coords => {
    const xgrid = Math.round(x), ygrid = Math.round(y);
    x -= xgrid, y -= ygrid; // remainder
    const dx = Math.round(x + 0.5 * y) * (x * x >= y * y ? 1 : 0);
    const dy = Math.round(y + 0.5 * x) * (x * x < y * y ? 1 : 0);
    return { x: xgrid + dx, y: ygrid + dy };
  }

  /**
   * Transforms the pixel coordinates to hexagon coordinates.
   * @param x X coordinate of the pixel.
   * @param y Y coordinate of the pixel.
   * @returns An object combining:
   * cell: The hexagon coordinates in matrix representation.
   * delta: The delta between the pixel coordinates and the center of the hexagon.
   * This is useful for determining the direction of the click.
   * If one of the delta values (in MODULO) is above 0.25, the mouse position is closer to the next hexagon.
   * This can be applied for directional attack or movement.
   */
  public pixelToHexWithDirectionalDetail(x: number, y: number): { cell: Coords, direction: HexDirection } {

    let originalCell = this.pixelToHex(x, y);
    let newPixels = this.hexToPixel(originalCell.x, originalCell.y);

    // For the new hexagon, located at newPixels, we can also check the direction by checking the original x & y coordinates against 3 lines:
    // - the line that goes through the center of the hexagon and is parallel to the y-axis
    // - the line that goes through the center of the hexagon and is: y = x * 1/sqrt(3)
    // - the line that goes through the center of the hexagon and is: y = x * -1/sqrt(3)
    // For the equations, if x0, y0 are the original coordinates, check if the point is above the line: "y = x * 1/sqrt(3)" if "y > x / sqrt(3)"
    const line1factor = (x - newPixels.x) > 0 ? 1 : 0;
    const line2factor = (y - newPixels.y) > (x - newPixels.x) * HexMap.INV_SQRT3 ? 2 : 0;
    const line3factor = (y - newPixels.y) > -1 * (x - newPixels.x) * HexMap.INV_SQRT3 ? 4 : 0;

    //   \ 0 | 1 /
    //    \ | /
    //  2  |   5
    //   / | \
    //  /6 | 7\

    let alternateDirection = line1factor + line2factor + line3factor;

    switch (alternateDirection) {
      case 0:
        return { cell: originalCell, direction: HexDirection.NORTHWEST };
      case 1:
        return { cell: originalCell, direction: HexDirection.NORTHEAST };
      case 2:
        return { cell: originalCell, direction: HexDirection.WEST };
      case 5:
        return { cell: originalCell, direction: HexDirection.EAST };
      case 6:
        return { cell: originalCell, direction: HexDirection.SOUTHWEST };
      case 7:
        return { cell: originalCell, direction: HexDirection.SOUTHEAST };
      default:
        return { cell: originalCell, direction: HexDirection.NONE };
    }
  }


  /**
   * Finds the direction from one hexagon to another hexagon. Works only for neighbourd.
   * @param hexSource The coordinates of the source hexagon to start the search from.
   * @param neighbour The coordinates of the neighbour hexagon to find the direction to.
   * @returns The direction from the source hexagon to the neighbour hexagon. NONE if the given neighbour is not really a neighbour.
   */
  public getDirectionForNeighbour(hexSource: Coords, neighbour: Coords): HexDirection {
    for (let i = HexDirection.EAST; i <= HexDirection.SOUTHEAST; i++) {
      const neighbourInDir = this.getNeighbourInDirection(hexSource, i);
      if (neighbourInDir !== null && neighbourInDir.x == neighbour.x && neighbourInDir.y == neighbour.y) {
        return i;
      }
    }
    return HexDirection.NONE;
  }

  public getGeneralDirectionForTarget(source: Coords, target: Coords): HexDirection {
    const neighbour = this.getDirectionForNeighbour(source, target);
    if (neighbour !== HexDirection.NONE) {
      return neighbour;
    }

    let deltaX = target.x - source.x;
    let deltaY = target.y - source.y;

    if (deltaY === 0) {
      return deltaX > 0 ? HexDirection.EAST : HexDirection.WEST;
    }

    const report = Math.abs(deltaX) / Math.abs(deltaY);
    // sin(60deg) ~= 0.866
    // sin(30deg) == 0.5
    if (report > 0.5) {
      // east, west
      return deltaX > 0 ? HexDirection.EAST : HexDirection.WEST;
    }
    // norteast, northwest, southeast, southwest
    if (deltaY > 0) {
      return deltaX > 0 ? HexDirection.SOUTHEAST : HexDirection.SOUTHWEST;
    }
    return deltaX > 0 ? HexDirection.NORTHEAST : HexDirection.NORTHWEST;
  }
}

