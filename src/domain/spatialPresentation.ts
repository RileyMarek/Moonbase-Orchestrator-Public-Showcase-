export const SENSOR_FIELD_RADIUS_M = 1.2;
export const LOCAL_VOXEL_LIMIT = 2048;
export const SENSOR_FRESHNESS_MS = 1000;

export function sensorFresh(now: number, poseAt: number, depthAt: number, synchronized: boolean) {
  return synchronized && [poseAt, depthAt].every(at => Number.isFinite(at) && at > 0 && now >= at && now - at < SENSOR_FRESHNESS_MS);
}

// Filter only the presentation; retained depth evidence stays in the voxel stream.
export function localVoxels(cells: Iterable<[number, number, number]>, resolution: number, x: number, y: number) {
  if (![resolution, x, y].every(Number.isFinite) || resolution <= 0) return [];
  const candidates: { cell: [number, number, number]; distance: number }[] = [];
  for (const cell of cells) {
    if (!cell.every(Number.isFinite)) continue;
    const distance = Math.hypot((cell[0] + .5) * resolution - x, (cell[1] + .5) * resolution - y);
    const height = (cell[2] + .5) * resolution;
    if (distance <= SENSOR_FIELD_RADIUS_M && height >= -.05 && height <= .85) candidates.push({ cell, distance });
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, LOCAL_VOXEL_LIMIT).map(row => row.cell);
}
