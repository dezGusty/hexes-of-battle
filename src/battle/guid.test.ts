import { HobGUID, GuidMaker } from './guid';
import { describe, it, expect } from 'vitest';

describe('HobGUID', () => {
  it('should create a HobGUID instance', () => {
    const guid = new HobGUID('1234');
    expect(guid).toBeInstanceOf(HobGUID);
  });

  it('should compare two HobGUID instances for equality', () => {
    const guid1 = new HobGUID('1234');
    const guid2 = new HobGUID('1234');
    const guid3 = new HobGUID('5678');
    expect(HobGUID.equals(guid1, guid2)).toBe(true);
    expect(HobGUID.equals(guid1, guid3)).toBe(false);
  });

  it('should compare two HobGUID instances using instance method', () => {
    const guid1 = new HobGUID('1234');
    const guid2 = new HobGUID('1234');
    const guid3 = new HobGUID('5678');
    expect(guid1.equals(guid2)).toBe(true);
    expect(guid1.equals(guid3)).toBe(false);
  });
});

describe('GuidMaker', () => {
  it('should generate a valid HobGUID', () => {
    const guid = GuidMaker.generateGuid();
    expect(guid).toBeInstanceOf(HobGUID);
    expect(guid.getData()).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/);
  });
});