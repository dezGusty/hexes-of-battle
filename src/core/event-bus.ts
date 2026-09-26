export type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(callback);

    // Return unbind function
    return () => this.off(event, callback);
  }

  public off<T = any>(event: string, callback: EventCallback<T>): void {
    const bucket = this.listeners.get(event);
    if (bucket) {
      bucket.delete(callback);
      if (bucket.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T = any>(event: string, payload?: T): void {
    const bucket = this.listeners.get(event);
    if (bucket) {
      bucket.forEach((callback) => {
        try {
          callback(payload);
        } catch (err) {
          console.error(`Error in EventBus listener for event "${event}":`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
