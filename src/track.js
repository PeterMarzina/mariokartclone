// The closed circuit: centerline samples plus geometry helpers used for
// collision (clampToRoad) and progress tracking (nearestIndex).
import * as THREE from 'three';
import { N, MAX_LAT } from './config.js';

const ctrl = [
  [   0,   30], [   0,  -60], [  40, -120], [  95, -150],
  [ 120, -210], [  90, -270], [  20, -280], [ -50, -250],
  [ -70, -185], [-115, -150], [-140,  -80], [-110,  -20],
  [ -55,    0], [ -20,   15]
].map(([x, z]) => new THREE.Vector3(x, 0, z));

export const curve = new THREE.CatmullRomCurve3(ctrl, true, 'catmullrom', 0.5);

// even-spaced centerline points (drop the duplicated closing point)
const centerVec = curve.getSpacedPoints(N);
centerVec.pop();

export const center  = centerVec.map(p => ({ x: p.x, z: p.z }));
export const tangent = [];
export const normal  = [];
for (let i = 0; i < N; i++) {
  const a = center[i], b = center[(i + 1) % N];
  let dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len; dz /= len;
  tangent[i] = { x: dx, z: dz };
  normal[i]  = { x: -dz, z: dx };   // left of travel direction
}

// Rolling hills: a smooth, loop-periodic elevation profile. Integer harmonics
// keep it seamless at the start/finish seam; HILL_BASE keeps it above the grass
// plane so the road never clips through the terrain. Tune the amplitudes for
// bigger or gentler hills.
const HILL_BASE = 4;
for (let i = 0; i < N; i++) {
  const t = (i / N) * Math.PI * 2;
  center[i].y = HILL_BASE
    + 1.6 * Math.sin(2 * t)
    + 1.0 * Math.sin(3 * t + 0.8)
    + 0.5 * Math.sin(5 * t + 2.0);
}

// road surface height at a centerline index (stepped — for static props)
export function heightAt(idx) { return center[idx].y; }

// smoothly interpolated road height at a world position near `idx`.
// Used for the kart and camera so they glide over hills instead of snapping
// from one centerline sample to the next (which caused the screen shake).
export function groundY(x, z, idx) {
  const c = center[idx], t = tangent[idx];
  const along = (x - c.x) * t.x + (z - c.z) * t.z; // signed distance along track
  if (along >= 0) {
    const nx = center[(idx + 1) % N];
    const seg = Math.hypot(nx.x - c.x, nx.z - c.z) || 1;
    return c.y + (nx.y - c.y) * Math.min(along / seg, 1);
  }
  const px = center[(idx - 1 + N) % N];
  const seg = Math.hypot(c.x - px.x, c.z - px.z) || 1;
  return c.y + (px.y - c.y) * Math.min(-along / seg, 1);
}

// nearest centerline index via a local window around `last` (pass -1 to scan all)
export function nearestIndex(x, z, last) {
  let best = last, bestD = Infinity;
  const W = (last < 0) ? N : 30;
  const start = (last < 0) ? 0 : last - W;
  for (let k = 0; k <= 2 * W && (last >= 0 || k < N); k++) {
    const i = (last < 0) ? k : ((start + k) % N + N) % N;
    const dx = x - center[i].x, dz = z - center[i].z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = i; }
    if (last < 0 && k >= N - 1) break;
  }
  return best;
}

// clamp a position to the road ribbon; returns true if it hit a wall
export function clampToRoad(p, idx) {
  const c = center[idx], t = tangent[idx], n = normal[idx];
  const rx = p.x - c.x, rz = p.z - c.z;
  let lat = rx * n.x + rz * n.z;
  const along = rx * t.x + rz * t.z;
  if (Math.abs(lat) > MAX_LAT) {
    lat = Math.sign(lat) * MAX_LAT;
    p.x = c.x + t.x * along + n.x * lat;
    p.z = c.z + t.z * along + n.z * lat;
    return true;
  }
  return false;
}
