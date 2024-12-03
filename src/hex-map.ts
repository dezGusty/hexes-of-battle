export class HexMap {

  private OFFSET_X = 0;
  private OFFSET_Y = 0;
  private CELL_WIDTH = 80;
  private CELL_HEIGHT = 92;

  public offset(): { x: number, y: number } { return { x: this.OFFSET_X, y: this.OFFSET_Y }; }
  public setOffset(x: number, y: number) { this.OFFSET_X = x; this.OFFSET_Y = y; }
  public cellSize(): { x: number, y: number } { return { x: this.CELL_WIDTH, y: this.CELL_HEIGHT }; }
  public setCellSize(size: number) { this.CELL_WIDTH = size; }

  constructor(public width: number, public height: number) {
  }

  getCellTopCornerCoords(cursorPos: { x: number, y: number }): { x: number, y: number } {
    const columnXOffset = cursorPos.y % 2 === 0 ? 0 : this.CELL_WIDTH / 2;
    return {
      x: columnXOffset + this.OFFSET_X + cursorPos.x * this.CELL_WIDTH,
      y: this.OFFSET_Y + cursorPos.y * this.CELL_WIDTH * 0.75
    };
  }

  public hexToPixel(q: number, r: number): { x: number, y: number } {
    const SQRT3 = Math.sqrt(3);
    const size = this.CELL_WIDTH / SQRT3;
    let x = size * (SQRT3 * q + SQRT3 / 2 * r);
    let y = size * (3.0 / 2 * r);
    x += this.OFFSET_X;
    y += this.OFFSET_Y;

    // {0, 0} => {0, 0}
    // {0, 1} => {0, 1}
    // {0, 2} => {1, 2}
    // {0, 3} => {1, 3}
    // {0, 4} => {2, 4}
    x -= Math.floor(r / 2) * this.CELL_WIDTH;

    return { x, y };
  }

  public pixelToHex(x: number, y: number): { x: number, y: number } {

    let coordsWithoutOffset: { x: number, y: number } = { x: x - this.OFFSET_X, y: y - this.OFFSET_Y };
    const SQRT3 = Math.sqrt(3);
    const cellSize = this.CELL_WIDTH / SQRT3;

    let q = (coordsWithoutOffset.x * SQRT3 / 3 - coordsWithoutOffset.y / 3) / cellSize;
    let r = coordsWithoutOffset.y * 2 / 3 / cellSize;




    let result = this.axial_round(q, r);
    // adjust the q based on the r.
    // for lines with odd r, the q is shifted by half a cell to the right
    // {0, 0} => {0, 0}
    // {0, 1} => {0, 1}
    // {0, 2} => {1, 2}
    // {0, 3} => {1, 3}
    // {0, 4} => {2, 4}
    result.x += Math.floor(result.y / 2);

    return result;
  }

  public axial_round = (x: number, y: number): { x: number, y: number } => {
    const xgrid = Math.round(x), ygrid = Math.round(y);
    x -= xgrid, y -= ygrid; // remainder
    const dx = Math.round(x + 0.5 * y) * (x * x >= y * y ? 1 : 0);
    const dy = Math.round(y + 0.5 * x) * (x * x < y * y ? 1 : 0);
    return { x: xgrid + dx, y: ygrid + dy };
  }


}

