
export class NumMatrix {

    public static resetToZero(matrix: number[][]) {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                matrix[i][j] = 0;
            }
        }
    }

    public static initializeToSize(matrix: number[][], mapWidth: number, mapHeight: number): void {
        // initialize the matrix, as it could contain data from a previous calculation
        matrix.length = mapWidth;

        for (let i = 0; i < mapWidth; i++) {
            matrix[i] = [] as number[];
            for (let j = 0; j < mapHeight; j++) {
                matrix[i][j] = 0;
            }
        }
    }

    private static leadingZeroes(num: number, length: number): string {
        return num.toString().padStart(length, "0");
    }

    public static logToConsole(matrix: number[][], hint: string) {
        console.log(hint);
        let rows = "";
        const height = matrix[0].length;
        const width = matrix.length;
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                rows += NumMatrix.leadingZeroes(matrix[i][j], 2) + " ";
            }
            rows += "\n";
        }
        console.log(rows);
    }

}


