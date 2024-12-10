import { Coords } from "./shared";

export class HexMapConfig {
  public OFFSET_X = 0;
  public OFFSET_Y = 0;
  public CELL_WIDTH = 80;
  public CELL_HEIGHT = 92;
}

export enum HexDirection {
  EAST = 0,
  NORTHEAST = 1,
  NORTHWEST = 2,
  WEST = 3,
  SOUTHWEST = 4,
  SOUTHEAST = 5
}

export class ReachData {
  constructor(public coords: Coords, public reach: number) { }
}

export class HexMap {

  static DEFAULT_HEX_MAP_CONFIG: HexMapConfig = {
    OFFSET_X: 0,
    OFFSET_Y: 0,
    CELL_WIDTH: 80,
    CELL_HEIGHT: 92
  };

  public tiles: number[][] = [];

  public offset(): Coords { return { x: this.config.OFFSET_X, y: this.config.OFFSET_Y }; }
  public setOffset(x: number, y: number) { this.config.OFFSET_X = x; this.config.OFFSET_Y = y; }
  public cellSize(): Coords { return { x: this.config.CELL_WIDTH, y: this.config.CELL_HEIGHT }; }
  public setCellSize(size: number) { this.config.CELL_WIDTH = size; }

  constructor(public width: number, public height: number, private config: HexMapConfig = HexMap.DEFAULT_HEX_MAP_CONFIG) {

  }

  public initializeToSize(mapWidth: number, mapHeight: number) {
    for (let i = 0; i < mapWidth; i++) {
      this.tiles[i] = [];
      for (let j = 0; j < mapHeight; j++) {
        // get a random value between 1 and 5
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
    for (let i = 0; i < 6; i++) {
      let neighbour = this.getNeighbourInDirection(coords, i);
      if (neighbour !== null) {
        result.push(neighbour);
      }
    }
    return result;
  }

  public getNeighbourInDirection(coords: Coords, direction: HexDirection): Coords | null {
    let result = this.getCoordsInDirectionInternal(coords, direction);
    if (result === null) return null;
    if (result.x < 0 || result.x >= this.width || result.y < 0 || result.y >= this.height) return null;
    return result;
  }

  private getCoordsInDirectionInternal(coords: Coords, direction: HexDirection): Coords | null {
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
    const SQRT3 = Math.sqrt(3);
    const cellSize = this.config.CELL_WIDTH / SQRT3;
    let x = this.config.OFFSET_X + cellSize * (SQRT3 * q + SQRT3 / 2 * r);
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
    const SQRT3 = Math.sqrt(3);
    let coordsWithoutOffset: Coords = { x: x - this.config.OFFSET_X, y: y - this.config.OFFSET_Y };
    const cellSize = this.config.CELL_WIDTH / SQRT3;

    let q = (coordsWithoutOffset.x * SQRT3 / 3 - coordsWithoutOffset.y / 3) / cellSize;
    let r = coordsWithoutOffset.y * 2 / 3 / cellSize;

    let result = this.axial_round(q, r);

    // Adjust the horizontal position for lines with odd r, the q is shifted by half a cell to the right
    // {0, 0} => {0, 0}
    //  {0, 1} => {0, 1}
    // {0, 2} => {1, 2}
    //  {0, 3} => {1, 3}
    // {0, 4} => {2, 4}
    result.x += Math.floor(result.y / 2);

    return result;
  }

  private axial_round = (x: number, y: number): Coords => {
    const xgrid = Math.round(x), ygrid = Math.round(y);
    x -= xgrid, y -= ygrid; // remainder
    const dx = Math.round(x + 0.5 * y) * (x * x >= y * y ? 1 : 0);
    const dy = Math.round(y + 0.5 * x) * (x * x < y * y ? 1 : 0);
    return { x: xgrid + dx, y: ygrid + dy };
  }


}

