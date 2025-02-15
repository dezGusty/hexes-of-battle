import { describe, it, expect } from 'vitest';
import { reverseDirection, HexDirection, hexDirectionToString, HexMapHelpers, HexMap } from './hex-map';

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

describe('getOuterRadiusCoordsNoBounds', () => {
  it('should return the correct coordinates for a given radius', () => {
    // const hexMap = new HexMap(10, 10);
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

    expect(HexMap.createFloodFillMatrix(center, radius, matrix, width, height, value)).toEqual(expectedMatrix);
  });
});
