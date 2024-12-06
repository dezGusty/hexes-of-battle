export class HexMap {

  private OFFSET_X = 0;
  private OFFSET_Y = 0;
  private CELL_WIDTH = 80;
  private CELL_HEIGHT = 92;

  static readonly ZOOM_LEVEL_MIN = 0.5;
  static readonly ZOOM_LEVEL_MAX = 2;

  private zoomLevel_ = 1;

  public offset(): { x: number, y: number } { return { x: this.OFFSET_X, y: this.OFFSET_Y }; }
  public setOffset(x: number, y: number) { this.OFFSET_X = x; this.OFFSET_Y = y; }
  public cellSize(): { x: number, y: number } { return { x: this.CELL_WIDTH, y: this.CELL_HEIGHT }; }
  public setCellSize(size: number) { this.CELL_WIDTH = size; }

  public get zoomLevel(): number { return this.zoomLevel_; }
  public set zoomLevel(value: number) {
    if (value < HexMap.ZOOM_LEVEL_MIN || value > HexMap.ZOOM_LEVEL_MAX) {
      console.log(`Zoom level must be between ${HexMap.ZOOM_LEVEL_MIN} and ${HexMap.ZOOM_LEVEL_MAX}`);
      return;
    }
    this.zoomLevel_ = value;
    this.CELL_WIDTH = 80 * value;
    this.CELL_HEIGHT = 92 * value;
  }

  constructor(public width: number, public height: number) {
  }

  /**
   * Transforms the hexagon coordinates from matrix representation to pixel representation.
   * Note: The hexagon is assumed to be oriented with one of its corners pointing up.
   * 
   * @param q X coordinate of the hexagon in matrix representation
   * @param r Y coordinate of the hexagon in matrix representation
   * @returns The center of the hexagon in pixel coordinates
   */
  public hexToPixel(q: number, r: number): { x: number, y: number } {
    const SQRT3 = Math.sqrt(3);
    const cellSize = this.CELL_WIDTH / SQRT3;
    let x = this.OFFSET_X + cellSize * (SQRT3 * q + SQRT3 / 2 * r);
    let y = this.OFFSET_Y + cellSize * (3.0 / 2 * r);

    // Adjust the horizontal position.
    // {0, 0} => {0, 0}
    //  {0, 1} => {0, 1}
    // {0, 2} => {1, 2}
    //  {0, 3} => {1, 3}
    // {0, 4} => {2, 4}
    x -= Math.floor(r / 2) * this.CELL_WIDTH;

    return { x, y };
  }

  /**
   * Transforms the pixel coordinates to hexagon coordinates.
   * @param x X coordinate of the pixel.
   * @param y Y coordinate of the pixel.
   * @returns The hexagon coordinates in matrix representation.
   */
  public pixelToHex(x: number, y: number): { x: number, y: number } {
    const SQRT3 = Math.sqrt(3);
    let coordsWithoutOffset: { x: number, y: number } = { x: x - this.OFFSET_X, y: y - this.OFFSET_Y };
    const cellSize = this.CELL_WIDTH / SQRT3;

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

  private axial_round = (x: number, y: number): { x: number, y: number } => {
    const xgrid = Math.round(x), ygrid = Math.round(y);
    x -= xgrid, y -= ygrid; // remainder
    const dx = Math.round(x + 0.5 * y) * (x * x >= y * y ? 1 : 0);
    const dy = Math.round(y + 0.5 * x) * (x * x < y * y ? 1 : 0);
    return { x: xgrid + dx, y: ygrid + dy };
  }


}

