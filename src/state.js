// Mutable race state. `gameState` is a live export: it's null until
// initState() runs, after which every importer sees the real object.
import { center, normal, tangent } from './track.js';

export let gameState = null;
export let raceStartTime = 0;

export function spawnPos(idx, lat) {
  const c = center[idx], n = normal[idx];
  return { x: c.x + n.x * lat, z: c.z + n.z * lat };
}

export function spawnRot(idx) {
  return Math.atan2(tangent[idx].x, tangent[idx].z);
}

export function makeAI(idx, lat, color, name) {
  const p = spawnPos(idx, lat);
  return {
    pos: { x: p.x, z: p.z }, rot: spawnRot(idx),
    speed: 0, baseSpeed: 0.35 + Math.random() * 0.05,
    boostTimer: 0, boostPower: 0, spinTimer: 0,
    idx, lastIdx: idx, lap: 0, lateral: lat, name, color
  };
}

export function initState() {
  const p0 = spawnPos(0, 0);
  gameState = {
    lap: 0, lastIdx: 0, idx: 0,
    playerSpeed: 0,
    playerPos: { x: p0.x, y: 0, z: p0.z },
    playerRot: spawnRot(0),
    boostTimer: 0, boostPower: 0, boostColor: 0x22d3ee,
    heldItem: null, spinTimer: 0,
    drifting: false, driftDir: 1, driftCharge: 0,
    isPlayer: true,
    gameOver: false, winner: null,
    aiKarts: [
      makeAI(2, -5, 0xe11d48, 'AI-0'),
      makeAI(4,  5, 0xf97316, 'AI-1')
    ]
  };
  raceStartTime = Date.now();
}
