export class HobGUID {
  constructor(private data: string) {}

  static equals(guid1: HobGUID, guid2: HobGUID): boolean {
    return guid1.data === guid2.data;
  }

  public equals(other: HobGUID): boolean {
    return HobGUID.equals(this, other);
  }

  public getData(): string {
    return this.data;
  }
}

export class GuidMaker {
  static generateGuid(): HobGUID {
    return new HobGUID(GuidMaker.s4() + '-' + GuidMaker.s4() + '-' + GuidMaker.s4() + '-' + GuidMaker.s4());
  }

  private static s4(): string {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
}