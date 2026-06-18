// Lucky item boxes, power-ups, and the defensive items (banana + green shell)
// with their on-track hazards and spin-out logic.
import * as THREE from 'three';
import { scene } from './scene.js';
import { N } from './config.js';
import { nearestIndex, clampToRoad, normal, heightAt } from './track.js';
import { itemBoxTexture } from './textures.js';
import { burst, showEffect } from './effects.js';
import { gameState, spawnPos } from './state.js';

const itemBoxes = [];
const RESPAWN_MS = 2500; // respawn a grabbed box after a couple of seconds

// each "lucky" boost outcome has its own flavour, color and banner
const EFFECTS = [
  { label: '⚡ BOOST!',      power: 0.80, frames: 90,  color: 0x22d3ee },
  { label: '🍄 MUSHROOM!',   power: 0.88, frames: 75,  color: 0xff4d6d },
  { label: '🌟 STAR POWER!', power: 0.98, frames: 140, color: 0xffe14d }
];

function applyBoost(entity, eff, isPlayer) {
  entity.boostTimer = eff.frames;
  entity.boostPower = eff.power;
  entity.boostColor = eff.color;
  if (isPlayer) showEffect(eff.label);
}

export function buildItemBoxes() {
  const tex = itemBoxTexture();
  const count = 8;
  const step = Math.floor(N / count);
  for (let i = 0; i < count; i++) {
    const idx = (i * step + 12) % N;          // offset off the start line
    const lat = [-6, 0, 6][i % 3];
    const p = spawnPos(idx, lat);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffaa00, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.1
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
    const baseY = heightAt(idx) + 1.7;
    mesh.position.set(p.x, baseY, p.z);
    mesh.castShadow = true;
    scene.add(mesh);
    itemBoxes.push({ mesh, x: p.x, z: p.z, baseY, active: true, respawnAt: 0 });
  }
}

// decide what a box gives: player can win a held item, AI always boosts
function grantReward(k) {
  if (k.isPlayer) {
    const r = Math.random();
    if (r < 0.5 || gameState.heldItem) {
      applyBoost(gameState, EFFECTS[(Math.random() * EFFECTS.length) | 0], true);
    } else if (r < 0.75) {
      gameState.heldItem = 'banana';
      showEffect('🍌 BANANA!');
    } else {
      gameState.heldItem = 'shell';
      showEffect('🐢 GREEN SHELL!');
    }
  } else {
    applyBoost(k.ref, EFFECTS[(Math.random() * EFFECTS.length) | 0], false);
  }
}

export function updateItemBoxes(now) {
  // who can pick up a box this frame
  const karts = [
    { x: gameState.playerPos.x, z: gameState.playerPos.z, isPlayer: true, ref: null },
    ...gameState.aiKarts.map(ai => ({ x: ai.pos.x, z: ai.pos.z, isPlayer: false, ref: ai }))
  ];

  itemBoxes.forEach(b => {
    if (b.active) {
      b.mesh.rotation.y += 0.04;
      b.mesh.rotation.x += 0.01;
      b.mesh.position.y = b.baseY + Math.sin(now * 0.003 + b.x) * 0.25;
      for (const k of karts) {
        const dx = k.x - b.x, dz = k.z - b.z;
        if (dx * dx + dz * dz < 4) { // ~2 unit pickup radius
          b.active = false;
          b.mesh.visible = false;
          b.respawnAt = now + RESPAWN_MS;
          burst(b.x, b.baseY - 0.1, b.z, 0xffd23f);
          grantReward(k);
          break;
        }
      }
    } else if (now >= b.respawnAt) {
      b.active = true;
      b.mesh.visible = true;
      burst(b.x, b.baseY - 0.1, b.z, 0x9be15a, 10); // little re-appear sparkle
    }
  });
}

// ── defensive items + hazards ──
const bananas = [];
const shells  = [];
const SPIN_FRAMES = 60;

const BANANA_GEO = new THREE.SphereGeometry(0.6, 10, 8);
const BANANA_MAT = new THREE.MeshStandardMaterial({ color: 0xffe14d, roughness: 0.5 });
const SHELL_GEO  = new THREE.SphereGeometry(0.6, 12, 10);
const SHELL_MAT  = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3, metalness: 0.2 });

export function useItem() {
  if (gameState.gameOver || !gameState.heldItem) return;
  const s = gameState;
  if (s.heldItem === 'banana') {
    const bx = s.playerPos.x - Math.sin(s.playerRot) * 2.4;
    const bz = s.playerPos.z - Math.cos(s.playerRot) * 2.4;
    const by = heightAt(nearestIndex(bx, bz, s.idx)) + 0.5;
    const mesh = new THREE.Mesh(BANANA_GEO, BANANA_MAT);
    mesh.scale.set(1, 0.55, 1.35);
    mesh.position.set(bx, by, bz);
    mesh.castShadow = true;
    scene.add(mesh);
    bananas.push({ mesh, x: bx, y: by, z: bz, owner: 'player', graceUntil: performance.now() + 900 });
  } else if (s.heldItem === 'shell') {
    const sx = s.playerPos.x + Math.sin(s.playerRot) * 2.4;
    const sz = s.playerPos.z + Math.cos(s.playerRot) * 2.4;
    const si = nearestIndex(sx, sz, s.idx);
    const mesh = new THREE.Mesh(SHELL_GEO, SHELL_MAT);
    mesh.position.set(sx, heightAt(si) + 0.6, sz);
    mesh.castShadow = true;
    scene.add(mesh);
    shells.push({
      mesh, x: sx, z: sz,
      vx: Math.sin(s.playerRot) * 0.7, vz: Math.cos(s.playerRot) * 0.7,
      idx: si, bounces: 6, life: 320,
      owner: 'player', graceUntil: performance.now() + 250
    });
  }
  s.heldItem = null;
}

function spinTargets() {
  return [
    { x: gameState.playerPos.x, z: gameState.playerPos.z, id: 'player',
      spin: () => { if (gameState.spinTimer <= 0) showEffect('💫 SPUN OUT!'); gameState.spinTimer = SPIN_FRAMES; } },
    ...gameState.aiKarts.map(ai => ({ x: ai.pos.x, z: ai.pos.z, id: ai.name,
      spin: () => { ai.spinTimer = SPIN_FRAMES; } }))
  ];
}

export function updateHazards(now) {
  const karts = spinTargets();

  // green shells: travel, bounce off walls, spin out karts on contact
  for (let i = shells.length - 1; i >= 0; i--) {
    const sh = shells[i];
    sh.x += sh.vx; sh.z += sh.vz;
    const idx = nearestIndex(sh.x, sh.z, sh.idx); sh.idx = idx;
    const gy = heightAt(idx);
    const pos = { x: sh.x, z: sh.z };
    if (clampToRoad(pos, idx)) {
      sh.x = pos.x; sh.z = pos.z;
      const n = normal[idx];
      const dot = sh.vx * n.x + sh.vz * n.z;
      sh.vx -= 2 * dot * n.x; sh.vz -= 2 * dot * n.z; // reflect
      sh.bounces--;
      burst(sh.x, gy + 0.6, sh.z, 0x86efac, 8);
    }
    sh.mesh.position.set(sh.x, gy + 0.6, sh.z);
    sh.mesh.rotation.y += 0.4;
    sh.life--;

    let hit = false;
    for (const k of karts) {
      if (k.id === sh.owner && now < sh.graceUntil) continue;
      const dx = k.x - sh.x, dz = k.z - sh.z;
      if (dx * dx + dz * dz < 2.4) { k.spin(); burst(sh.x, gy + 0.8, sh.z, 0x22c55e); hit = true; break; }
    }
    if (hit || sh.life <= 0 || sh.bounces < 0) { scene.remove(sh.mesh); shells.splice(i, 1); }
  }

  // bananas: sit on the track, spin out anyone who touches them
  for (let i = bananas.length - 1; i >= 0; i--) {
    const ba = bananas[i];
    ba.mesh.rotation.y += 0.02;
    for (const k of karts) {
      if (k.id === ba.owner && now < ba.graceUntil) continue;
      const dx = k.x - ba.x, dz = k.z - ba.z;
      if (dx * dx + dz * dz < 2.4) { k.spin(); burst(ba.x, ba.y, ba.z, 0xffe14d); scene.remove(ba.mesh); bananas.splice(i, 1); break; }
    }
  }
}
