import { describe, it, expect } from 'vitest';
import { reverseDirection, HexDirection, hexDirectionToString } from './hex-map';

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
