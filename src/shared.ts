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

export function swapValues(a: number, b: number) {
  // Use a XOR swap to swap the values in place
  a = a ^ b;
  b = a ^ b;
  a = a ^ b;
}

/**
 * Get a random value between the lower and upper bounds (including these values).
 * @param lower_bound Lower bound
 * @param upper_bound Upper bound
 * @returns 
 */
export function getRandomValueBetween(lower_bound: number, upper_bound: number): number {
  if (lower_bound > upper_bound) {
    swapValues(lower_bound, upper_bound);
  }
  return lower_bound + Math.floor(Math.random() * (upper_bound - lower_bound + 1));
}