import { describe, it, expect } from 'vitest';
import { reverseDirection, HexDirection, hexDirectionToString, HexMapHelpers, HexMap, checkFlankingStatus, HexFlankStatus } from './hex-map';

describe('reverseDirection', () => {
  it('should return the opposite direction', () => {
    expect(reverseDirection(HexDirection.EAST)).toBe(HexDirection.WEST);
    expect(reverseDirection(HexDirection.NORTHEAST)).toBe(HexDirection.SOUTHWEST);
    expect(reverseDirection(HexDirection.NORTHWEST)).toBe(HexDirection.SOUTHEAST);
    expect(reverseDirection(HexDirection.WEST)).toBe(HexDirection.EAST);
    expect(reverseDirection(HexDirection.SOUTHWEST)).toBe(HexDirection.NORTHEAST);
    expect(reverseDirection(HexDirection.SOUTHEAST)).toBe(HexDirection.NORTHWEST);
  });

  it('should return NONE for NONE direction', () => {
    expect(reverseDirection(HexDirection.NONE)).toBe(HexDirection.NONE);
  });
});

describe('hexDirectionToString', () => {
  it('should return the correct string for each direction', () => {
    expect(hexDirectionToString(HexDirection.NONE)).toBe("NONE");
    expect(hexDirectionToString(HexDirection.EAST)).toBe("EAST");
    expect(hexDirectionToString(HexDirection.NORTHEAST)).toBe("NORTHEAST");
    expect(hexDirectionToString(HexDirection.NORTHWEST)).toBe("NORTHWEST");
    expect(hexDirectionToString(HexDirection.WEST)).toBe("WEST");
    expect(hexDirectionToString(HexDirection.SOUTHWEST)).toBe("SOUTHWEST");
    expect(hexDirectionToString(HexDirection.SOUTHEAST)).toBe("SOUTHEAST");
  });
});

describe('getCoordsInDirectionInternal', () => {
  it('should return the correct coordinates for each direction', () => {
    let coords = { x: 2, y: 2 };
    expect(HexMapHelpers.directionCoordsMap[HexDirection.EAST](coords)).toEqual({ x: 3, y: 2 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.NORTHEAST](coords)).toEqual({ x: 2, y: 1 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.NORTHWEST](coords)).toEqual({ x: 1, y: 1 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.WEST](coords)).toEqual({ x: 1, y: 2 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.SOUTHWEST](coords)).toEqual({ x: 1, y: 3 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.SOUTHEAST](coords)).toEqual({ x: 2, y: 3 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.NONE](coords)).toBeNull();

    coords = { x: 4, y: 4 };
    expect(HexMapHelpers.directionCoordsMap[HexDirection.EAST](coords)).toEqual({ x: 5, y: 4 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.NORTHEAST](coords)).toEqual({ x: 4, y: 3 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.NORTHWEST](coords)).toEqual({ x: 3, y: 3 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.WEST](coords)).toEqual({ x: 3, y: 4 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.SOUTHWEST](coords)).toEqual({ x: 3, y: 5 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.SOUTHEAST](coords)).toEqual({ x: 4, y: 5 });
    expect(HexMapHelpers.directionCoordsMap[HexDirection.NONE](coords)).toBeNull();

  });
});

describe('getNeighbourInDirectionNoBounds_EAST', () => {
  it('should return the correct coordinates for each direction', () => {
    let coords = { x: 2, y: 2 };
    expect(HexMap.getNeighbourInDirectionNoBounds(coords, HexDirection.EAST)).toEqual({ x: 3, y: 2 });
  });
});
describe('getNeighbourInDirectionNoBounds_NORTHEAST', () => {
  it('should return the correct coordinates for each direction', () => {
    let coords = { x: 9, y: 0 };
    expect(HexMap.getNeighbourInDirectionNoBounds(coords, HexDirection.NORTHEAST)).toEqual({ x: 9, y: -1 });

    coords = { x: 9, y: -1 };
    expect(HexMap.getNeighbourInDirectionNoBounds(coords, HexDirection.NORTHEAST)).toEqual({ x: 10, y: -2 });

    coords = { x: 8, y: -2 };
    expect(HexMap.getNeighbourInDirectionNoBounds(coords, HexDirection.NORTHEAST)).toEqual({ x: 8, y: -3 });
  });
});
describe('getNeighbourInDirectionNoBounds_NORTHWEST', () => {
  it('should return the correct coordinates for each direction', () => {
    let coords = { x: 8, y: -1 };
    expect(HexMap.getNeighbourInDirectionNoBounds(coords, HexDirection.NORTHWEST)).toEqual({ x: 8, y: -2 });
  });
});

describe('getOuterRadiusCoordsNoBounds', () => {
  it('should return the correct coordinates for a given radius', () => {
    const center = { x: 1, y: 5 };
    const radius = 2;
    let expectedCoords = [];
    expectedCoords[HexDirection.NONE] = { x: 1, y: 5 };
    expectedCoords[HexDirection.NORTHEAST] = { x: 2, y: 3 };
    expectedCoords[HexDirection.EAST] = { x: 3, y: 5 };
    expectedCoords[HexDirection.SOUTHEAST] = { x: 2, y: 7 };
    expectedCoords[HexDirection.SOUTHWEST] = { x: 0, y: 7 };
    expectedCoords[HexDirection.WEST] = { x: -1, y: 5 };
    expectedCoords[HexDirection.NORTHWEST] = { x: 0, y: 3 };

    expect(HexMap.getOuterRadiusCoordsNoBounds(center, radius)).toEqual(expectedCoords);
  });
});

describe('getOuterRadiusCoordsNoBounds v2', () => {
  it('should return the correct coordinates for a given radius', () => {
    const center = { x: 7, y: 4 };
    const radius = 4;
    let expectedCoords = [];
    expectedCoords[HexDirection.NONE] = { x: 7, y: 4 };
    expectedCoords[HexDirection.NORTHEAST] = { x: 9, y: 0 };
    expectedCoords[HexDirection.EAST] = { x: 11, y: 4 };
    expectedCoords[HexDirection.SOUTHEAST] = { x: 9, y: 8 };
    expectedCoords[HexDirection.SOUTHWEST] = { x: 5, y: 8 };
    expectedCoords[HexDirection.WEST] = { x: 3, y: 4 };
    expectedCoords[HexDirection.NORTHWEST] = { x: 5, y: 0 };

    expect(HexMap.getOuterRadiusCoordsNoBounds(center, radius)).toEqual(expectedCoords);
  });
});

describe('getOuterRadiusCoordsNoBounds v3', () => {
  it('should return the correct coordinates for a given radius', () => {
    const center = { x: 7, y: 4 };
    const radius = 6;
    let expectedCoords = [];
    expectedCoords[HexDirection.NONE] = { x: 7, y: 4 };
    expectedCoords[HexDirection.NORTHEAST] = { x: 10, y: -2 };
    expectedCoords[HexDirection.EAST] = { x: 13, y: 4 };
    expectedCoords[HexDirection.SOUTHEAST] = { x: 10, y: 10 };
    expectedCoords[HexDirection.SOUTHWEST] = { x: 4, y: 10 };
    expectedCoords[HexDirection.WEST] = { x: 1, y: 4 };
    expectedCoords[HexDirection.NORTHWEST] = { x: 4, y: -2 };

    expect(HexMap.getOuterRadiusCoordsNoBounds(center, radius)).toEqual(expectedCoords);
  });
});

describe('getOuterRadiusCoordsNoBounds v4', () => {
  it('should return the correct coordinates for a given radius', () => {
    const center = { x: 9, y: 0 };
    const radius = 2;
    let expectedCoords = [];
    expectedCoords[HexDirection.NONE] = { x: 9, y: 0 };
    expectedCoords[HexDirection.EAST] = { x: 11, y: 0 };
    expectedCoords[HexDirection.NORTHWEST] = { x: 8, y: -2 };
    expectedCoords[HexDirection.NORTHEAST] = { x: 10, y: -2 };
    expectedCoords[HexDirection.SOUTHEAST] = { x: 10, y: 2 };
    expectedCoords[HexDirection.SOUTHWEST] = { x: 8, y: 2 };
    expectedCoords[HexDirection.WEST] = { x: 7, y: 0 };

    expect(HexMap.getOuterRadiusCoordsNoBounds(center, radius)).toEqual(expectedCoords);
  });
});

describe('getOuterRadiusCoordsNoBounds v5', () => {
  it('should return the correct coordinates for a given radius', () => {
    const center = { x: 9, y: 0 };
    const radius = 1;
    let expectedCoords = [];
    expectedCoords[HexDirection.NONE] = { x: 9, y: 0 };
    expectedCoords[HexDirection.NORTHEAST] = { x: 9, y: -1 };
    expectedCoords[HexDirection.EAST] = { x: 10, y: 0 };
    expectedCoords[HexDirection.SOUTHEAST] = { x: 9, y: 1 };
    expectedCoords[HexDirection.SOUTHWEST] = { x: 8, y: 1 };
    expectedCoords[HexDirection.WEST] = { x: 8, y: 0 };
    expectedCoords[HexDirection.NORTHWEST] = { x: 8, y: -1 };

    expect(HexMap.getOuterRadiusCoordsNoBounds(center, radius)).toEqual(expectedCoords);
  });
});


describe('createFloodFillMatrix', () => {
  it('should create a flood-fill matrix for a given radius', () => {
    const width = 10;
    const height = 10;
    const matrix = Array.from({ length: width }, () => Array(height).fill(0));
    const center = { x: 1, y: 5 };
    const radius = 2;
    const value = 1;

    // note: in the representation below, the X coordinate is on the vertical and the Y coordinate is on the horizontal

    const expectedMatrix = [
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    expect(HexMap.fillRadiusInMatrix(center, radius, matrix, width, height, value)).toEqual(expectedMatrix);
  });
});

describe('createFloodFillMatrix v2', () => {
  it('should create a flood-fill matrix for a given radius', () => {
    const width = 10;
    const height = 10;
    const matrix = Array.from({ length: width }, () => Array(height).fill(0));
    const center = { x: 1, y: 5 };
    const radius = 2;
    const value_cell = 1;
    const value_border = 2;

    // note: in the representation below, the X coordinate is on the vertical and the Y coordinate is on the horizontal

    const expectedMatrix = [
      [0, 0, 0, 2, 2, 1, 2, 2, 0, 0],
      [0, 0, 0, 2, 1, 1, 1, 2, 0, 0],
      [0, 0, 0, 2, 1, 1, 1, 2, 0, 0],
      [0, 0, 0, 0, 2, 2, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    expect(HexMap.fillRadiusInMatrix(center, radius, matrix, width, height, value_cell, value_border)).toEqual(expectedMatrix);
  });
});


// describe('createFloodFillMatrix v3', () => {
//   it('should create a flood-fill matrix for a given radius', () => {
//     const width = 13;
//     const height = 9;
//     const matrix = Array.from({ length: width }, () => Array(height).fill(0));
//     const center = { x: 7, y: 4 };
//     const radius = 4;
//     const value_cell = 1;
//     const value_border = 2;

//     // note: in the representation below, the X coordinate is on the vertical and the Y coordinate is on the horizontal

//     const expectedMatrix = [
//       [0, 0, 0, 2, 2, 2, 0, 0, 0],
//       [0, 2, 2, 1, 1, 1, 2, 2, 0],
//       [2, 1, 1, 1, 1, 1, 1, 1, 2],
//       [1, 1, 1, 1, 1, 1, 1, 1, 1],
//       [1, 1, 1, 1, 1, 1, 1, 1, 1],
//       [1, 1, 1, 1, 1, 1, 1, 1, 1],
//       [1, 1, 1, 1, 1, 1, 1, 1, 1],
//       [2, 2, 1, 1, 1, 1, 1, 2, 2],
//       [0, 0, 2, 2, 1, 2, 2, 0, 0],
//       [0, 0, 0, 0, 2, 0, 0, 0, 0],
//       [0, 0, 0, 0, 2, 0, 0, 0, 0],
//       [0, 0, 0, 0, 2, 0, 0, 0, 0],
//       [0, 0, 0, 0, 2, 0, 0, 0, 0],
//     ];

//     expect(HexMap.fillRadiusInMatrix(center, radius, matrix, width, height, value_cell, value_border)).toEqual(expectedMatrix);
//   });
// });

describe('checkFlankingStatus', () => {
  it('should return NONE when facing direction or attack direction is NONE', () => {
    expect(checkFlankingStatus(HexDirection.NONE, HexDirection.EAST)).toBe(HexFlankStatus.NONE);
    expect(checkFlankingStatus(HexDirection.EAST, HexDirection.NONE)).toBe(HexFlankStatus.NONE);
  });

  it('should return FLANK when attack is coming from flanking directions', () => {
    expect(checkFlankingStatus(HexDirection.WEST, HexDirection.NORTHEAST)).toBe(HexFlankStatus.FLANK);
    expect(checkFlankingStatus(HexDirection.WEST, HexDirection.SOUTHEAST)).toBe(HexFlankStatus.FLANK);
  });

  it('should return BACKSTAB when attack is coming from backstab direction', () => {
    expect(checkFlankingStatus(HexDirection.WEST, HexDirection.EAST)).toBe(HexFlankStatus.BACKSTAB);
    expect(checkFlankingStatus(HexDirection.EAST, HexDirection.WEST)).toBe(HexFlankStatus.BACKSTAB);
  });

  it('should return NONE when attack is coming from other directions', () => {
    expect(checkFlankingStatus(HexDirection.WEST, HexDirection.NORTHWEST)).toBe(HexFlankStatus.NONE);
    expect(checkFlankingStatus(HexDirection.WEST, HexDirection.SOUTHWEST)).toBe(HexFlankStatus.NONE);
    expect(checkFlankingStatus(HexDirection.EAST, HexDirection.NORTHEAST)).toBe(HexFlankStatus.NONE);
    expect(checkFlankingStatus(HexDirection.EAST, HexDirection.SOUTHEAST)).toBe(HexFlankStatus.NONE);
  });
});
