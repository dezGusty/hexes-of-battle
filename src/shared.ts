export interface Coords {
  x: number, y: number
}

export function logMatrix(matrix: number[][], windth: number, height: number, hint: string) {
  console.log("Matrix: " + hint);
  let rows = "";
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < windth; i++) {
      rows += matrix[i][j] + " ";
    }
    rows += "\n";
  }
  console.log(rows);
}

export function getRandomAttackDamage(lower_bound: number, upper_bound: number): number {
  return lower_bound + Math.floor(Math.random() * (upper_bound - lower_bound + 1));
}