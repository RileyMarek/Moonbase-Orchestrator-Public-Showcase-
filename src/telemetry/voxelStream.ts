export class VoxelStream {
  cells = new Map<string, [number, number, number]>();
  epoch: number | null = null;
  sequence = 0;
  resolution = .05;
  revision = 0;
  synchronized = false;
  receivedAt = 0;
  clear() { this.cells.clear(); this.epoch = null; this.sequence = 0; this.synchronized = false; this.revision++; }
  accept(bytes: Uint8Array) {
    if (bytes.byteLength < 24) throw new Error('Truncated voxel header');
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (String.fromCharCode(...bytes.subarray(0,4)) !== 'MBVX' || v.getUint8(4) !== 1 || v.getUint8(5) > 1 || v.getUint16(6,true) !== 0) throw new Error('Unsupported voxel protocol');
    const full = v.getUint8(5) === 1, epoch = v.getUint32(8,true), sequence = v.getUint32(12,true), count = v.getUint32(16,true), resolution = v.getFloat32(20,true);
    if (count > 50000 || bytes.byteLength !== 24 + count * 6 || !Number.isFinite(resolution) || resolution < .019 || resolution > .201) throw new Error('Invalid voxel payload bounds');
    if (!full && (!this.synchronized || epoch !== this.epoch || sequence !== this.sequence + 1 || resolution !== this.resolution)) { this.clear(); return; }
    if (full && epoch === this.epoch && sequence <= this.sequence) return;
    const next = full ? new Map<string,[number,number,number]>() : new Map(this.cells);
    for (let i=0; i<count; i++) { const p: [number,number,number] = [v.getInt16(24+i*6,true),v.getInt16(26+i*6,true),v.getInt16(28+i*6,true)]; next.set(p.join(','),p); }
    if (next.size > 50000) throw new Error('Voxel capacity exceeded');
    this.cells = next; this.epoch = epoch; this.sequence = sequence; this.resolution = resolution; this.synchronized = true; this.revision++; this.receivedAt = performance.now();
  }
}
const streams = new Map<string,VoxelStream>();
export function voxelStream(id:string) { let s=streams.get(id); if(!s){s=new VoxelStream();streams.set(id,s);} return s; }
export function clearVoxelStreams() { for(const s of streams.values()) s.clear(); }
export function removeVoxelStream(id:string) { streams.delete(id); }
