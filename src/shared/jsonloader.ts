/**
 * JsonLoader class to load json files
 */
export class JsonLoader {
  public static async loadJson<T>(path: string): Promise<T> {
    const response = await fetch(path);
    const json = await response.json();
    return json as T;
  }
}
