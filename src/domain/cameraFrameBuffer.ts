/** Serial, decoded frame swaps. Failed requests never erase the last image. */
export class CameraFrameBuffer {
  private pending = false;
  private disposed = false;
  private current: string | null = null;
  private release: (url: string) => void;
  constructor(release: (url: string) => void) { this.release = release; }
  async refresh(load: () => Promise<string>, publish: (url: string) => void) {
    if (this.pending || this.disposed) return;
    this.pending = true;
    try {
      const next = await load();
      if (this.disposed) { this.release(next); return; }
      const previous = this.current;
      this.current = next;
      publish(next);
      if (previous) this.release(previous);
    } finally { this.pending = false; }
  }
  dispose() {
    this.disposed = true;
    if (this.current) this.release(this.current);
    this.current = null;
  }
}
