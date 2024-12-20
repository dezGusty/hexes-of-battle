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

  private static getSingleEdgeForDataCell(data: number[][], width: number, height: number, x: number, y: number): HexEdge {
    // check all neighbours
    let neighbours: Array<{ coord: Coords, value: number } | null> = [];
    for (let dir = HexDirection.EAST; dir <= HexDirection.SOUTHEAST; dir++) {
      const neighbour = HexMap.getNeighbourInDirectionInDataMatrix({ x, y }, dir, data, width, height);
      neighbours[dir] = neighbour;
    }

    let edgeDir = HexEdge.NORTH;
    if ((!neighbours[HexDirection.EAST] || neighbours[HexDirection.EAST].value < 1)
      && (!neighbours[HexDirection.NORTHEAST] || neighbours[HexDirection.NORTHEAST].value < 1)
      && (!neighbours[HexDirection.SOUTHEAST] || neighbours[HexDirection.SOUTHEAST].value < 1)
    ) {
      return HexEdge.EAST;
    } else if ((!neighbours[HexDirection.EAST] || neighbours[HexDirection.EAST].value < 1)
      && (!neighbours[HexDirection.NORTHEAST] || neighbours[HexDirection.NORTHEAST].value < 1)
      && (!neighbours[HexDirection.NORTHWEST] || neighbours[HexDirection.NORTHWEST].value < 1)
    ) {
      return HexEdge.NORTH_NORTHEAST;
    } else if ((!neighbours[HexDirection.WEST] || neighbours[HexDirection.WEST].value < 1)
      && (!neighbours[HexDirection.NORTHEAST] || neighbours[HexDirection.NORTHEAST].value < 1)
      && (!neighbours[HexDirection.NORTHWEST] || neighbours[HexDirection.NORTHWEST].value < 1)
    ) {
      return HexEdge.NORTH_NORTHWEST;
    } else if ((!neighbours[HexDirection.EAST] || neighbours[HexDirection.EAST].value < 1)
      && (!neighbours[HexDirection.SOUTHEAST] || neighbours[HexDirection.SOUTHEAST].value < 1)
      && (!neighbours[HexDirection.SOUTHWEST] || neighbours[HexDirection.SOUTHWEST].value < 1)
    ) {
      return HexEdge.SOUTH_SOUTHEAST;
    } else if ((!neighbours[HexDirection.WEST] || neighbours[HexDirection.WEST].value < 1)
      && (!neighbours[HexDirection.SOUTHEAST] || neighbours[HexDirection.SOUTHEAST].value < 1)
      && (!neighbours[HexDirection.SOUTHWEST] || neighbours[HexDirection.SOUTHWEST].value < 1)
    ) {
      return HexEdge.SOUTH_SOUTHWEST;
    } else if ((!neighbours[HexDirection.EAST] || neighbours[HexDirection.EAST].value < 1)
      && (!neighbours[HexDirection.NORTHEAST] || neighbours[HexDirection.NORTHEAST].value < 1)
    ) {
      return HexEdge.NORTHEAST;
    } else if ((!neighbours[HexDirection.EAST] || neighbours[HexDirection.EAST].value < 1)
      && (!neighbours[HexDirection.SOUTHEAST] || neighbours[HexDirection.SOUTHEAST].value < 1)
    ) {
      return HexEdge.SOUTHEAST;
    } else if ((!neighbours[HexDirection.WEST] || neighbours[HexDirection.WEST].value < 1)
      && (!neighbours[HexDirection.NORTHWEST] || neighbours[HexDirection.NORTHWEST].value < 1)
      && (!neighbours[HexDirection.SOUTHWEST] || neighbours[HexDirection.SOUTHWEST].value < 1)
    ) {
      return HexEdge.WEST;
    } else if ((!neighbours[HexDirection.WEST] || neighbours[HexDirection.WEST].value < 1)
      && (!neighbours[HexDirection.NORTHWEST] || neighbours[HexDirection.NORTHWEST].value < 1)
    ) {
      return HexEdge.NORTHWEST;
    } else if ((!neighbours[HexDirection.WEST] || neighbours[HexDirection.WEST].value < 1)
      && (!neighbours[HexDirection.SOUTHWEST] || neighbours[HexDirection.SOUTHWEST].value < 1)
    ) {
      return HexEdge.SOUTHWEST;
    } else if ((!neighbours[HexDirection.NORTHEAST] || neighbours[HexDirection.NORTHEAST].value < 1)
      && (!neighbours[HexDirection.NORTHWEST] || neighbours[HexDirection.NORTHWEST].value < 1)
    ) {
      return HexEdge.NORTH;
    } else if ((!neighbours[HexDirection.SOUTHEAST] || neighbours[HexDirection.SOUTHEAST].value < 1)
      && (!neighbours[HexDirection.SOUTHWEST] || neighbours[HexDirection.SOUTHWEST].value < 1)
    ) {
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
    smallerCell.x--;
    smallerCell.y--;
    return { cell: originalCell, direction: this.getNearDirectionForInnerHexCoords(smallerCell) };
  }

  private getNearDirectionForInnerHexCoords(smallerCell: Coords) {
    switch (smallerCell.x) {
      case 0:
        if (smallerCell.y == 0) {
          return HexDirection.NORTHWEST;
        } else if (smallerCell.y == 1) {
          return HexDirection.WEST;
        } else if (smallerCell.y == 2) {
          return HexDirection.SOUTHWEST;
        }
        break;
      case 1:
        if (smallerCell.y == 0) {
          return HexDirection.NORTHEAST;
        } else if (smallerCell.y == 2) {
          return HexDirection.SOUTHEAST;
        }
        break;

      case 2:
        if (smallerCell.x == 2 && smallerCell.y == 1) {
          return HexDirection.EAST;
        }
        break;
    }
    return HexDirection.NONE;
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
}

