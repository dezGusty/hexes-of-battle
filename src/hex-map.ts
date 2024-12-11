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

  constructor(public width: number, public height: number, private config: HexMapConfig = { ...HexMap.DEFAULT_HEX_MAP_CONFIG }) {

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
    for (let i = HexDirection.EAST; i <= HexDirection.SOUTHEAST; i++) {
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
    return HexMap.pixelToHexInternal(x, y, this.config.OFFSET_X, this.config.OFFSET_Y, this.config.CELL_WIDTH);
  }

  /**
   * Transforms the pixel coordinates to hexagon coordinates.
   * @param x X coordinate of the pixel.
   * @param y Y coordinate of the pixel.
   * @returns The hexagon coordinates in matrix representation.
   */
  static pixelToHexInternal(x: number, y: number, offset_x: number, offset_y: number, cell_width: number): Coords {
    const SQRT3 = Math.sqrt(3);
    let coordsWithoutOffset: Coords = { x: x - offset_x, y: y - offset_y };
    const cellSize = cell_width / SQRT3;

    let q = (coordsWithoutOffset.x * SQRT3 / 3 - coordsWithoutOffset.y / 3) / cellSize;
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
    // Create a smaller set of hexes, with the one at coords 1x1 at the same center as the original hex (newPixels)
    let smallerWidth = this.config.CELL_WIDTH * 0.5;


    let startPixelsOfSmaller = newPixels;
    startPixelsOfSmaller.x -= 2 * smallerWidth;
    startPixelsOfSmaller.y -= 1.5 * this.config.CELL_WIDTH / Math.sqrt(3);
    let smallerCell = HexMap.pixelToHexInternal(
      x, 
      y, 
      startPixelsOfSmaller.x, 
      startPixelsOfSmaller.y, 
      smallerWidth);
    smallerCell.x --;
    smallerCell.y --;
    let nearDirection = HexDirection.NONE;
    if (smallerCell.x != 1 || smallerCell.y != 1) {
      if (smallerCell.x == 0 && smallerCell.y == 0) {
        nearDirection = HexDirection.NORTHWEST;
      } else if (smallerCell.x == 0 && smallerCell.y == 1) {
        nearDirection = HexDirection.WEST;
      } else if (smallerCell.x == 1 && smallerCell.y == 0) {
        nearDirection = HexDirection.NORTHEAST;
      } else if (smallerCell.x == 2 && smallerCell.y == 1) {
        nearDirection = HexDirection.EAST;
      } else if (smallerCell.x == 0 && smallerCell.y == 2) {
        nearDirection = HexDirection.SOUTHWEST;
      } else if (smallerCell.x == 1 && smallerCell.y == 2) {
        nearDirection = HexDirection.SOUTHEAST;
      }
    }

    return { cell: originalCell, direction: nearDirection };
  }


  public getDirectionForDelta(delta: Coords): HexDirection {
    // if (Math.abs(delta.x) < 0.25 && Math.abs(delta.y) < 0.25) return HexDirection.NONE;

    if (delta.x == 0) {
      if (delta.y > 0) return HexDirection.NORTHEAST;
      if (delta.y < 0) return HexDirection.SOUTHEAST;
    } else {
      if (delta.y == 0) {
        if (delta.x > 0) return HexDirection.WEST;
        if (delta.x < 0) return HexDirection.EAST;
      }
    }

    return HexDirection.NONE;
  }
}

