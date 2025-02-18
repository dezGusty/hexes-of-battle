
export function resetNumericalMatrixToZero(matrix: number[][]) {
    // Note: consider to matrix.length, matrix[0].length
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            matrix[i][j] = 0;
        }
    }
}