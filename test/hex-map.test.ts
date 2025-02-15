import { describe, it, expect } from 'vitest';
import { reverseDirection, HexDirection } from '../src/hex-map';

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
