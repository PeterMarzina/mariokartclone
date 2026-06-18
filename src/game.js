// Game orchestrator: player/AI movement, lap logic, camera, init and loop.
import * as THREE from 'three';
import { scene, camera, renderer, setupLights } from './scene.js';
import { N, TOTAL_LAPS, CAMERA_DISTANCE, CAMERA_HEIGHT,
         AI_MODEL_PATHS, AI_MODEL_FACING, AI_MODEL_LENGTH } from './config.js';
import { center, normal, nearestIndex, clampToRoad, groundY } from './track.js';
import { gameState, initState } from './state.js';
import { buildWorld } from './world.js';
import { buildKartMesh, loadPlayerModel, loadColladaKart } from './karts.js';
import { buildItemBoxes, updateItemBoxes, updateHazards } from './items.js';
import { spawnParticle, updateParticles, showEffect } from './effects.js';
import { setupEventListeners, keys } from './input.js';
import { updateHUD, showGameOver } from './hud.js';

let playerKart;
let aiMeshes = [];
let aiTimer = 0;

const camTarget = new THREE.Vector3();
let camInit = false;

// ── lap progress ──
function advanceLap(entity, idx) {
  const d = idx - entity.lastIdx;
  if (d < -N / 2) entity.lap++;
  else if (d > N / 2) entity.lap = Math.max(0, entity.lap - 1);
  entity.lastIdx = idx;
  if (entity.lap >= TOTAL_LAPS && !gameState.gameOver) {
    gameState.gameOver = true;
    gameState.winner = entity.isPlayer ? 'player' : entity.name;
    showGameOver(entity.isPlayer, entity.name);
  }
}

// ── player ──
function updatePlayer() {
  const s = gameState;

  // spun out: no control, just spin to a stop
  if (s.spinTimer > 0) {
    s.spinTimer--;
    s.drifting = false; s.driftCharge = 0;
    s.playerSpeed *= 0.9;
    s.playerRot += 0.4;
    const p = s.playerPos;
    p.x += Math.sin(s.playerRot) * s.playerSpeed;
    p.z += Math.cos(s.playerRot) * s.playerSpeed;
    const idx = nearestIndex(p.x, p.z, s.lastIdx);
    clampToRoad(p, idx); s.idx = idx;
    playerKart.position.set(p.x, groundY(p.x, p.z, idx), p.z);
    playerKart.rotation.y = s.playerRot;
    playerKart.rotation.z = 0;
    advanceLap(s, idx);
    return;
  }

  const boosting = s.boostTimer > 0;
  if (boosting) s.boostTimer--;

  const fwdMax = boosting ? s.boostPower : 0.50;
  const accel  = boosting ? 0.03 : 0.008;
  if (keys['w']) {
    if (s.playerSpeed < fwdMax) s.playerSpeed = Math.min(s.playerSpeed + accel, fwdMax);
    else s.playerSpeed *= 0.99; // coast down smoothly after a boost
  }
  else if (keys['s']) s.playerSpeed = Math.max(s.playerSpeed - 0.006, -0.15);
  else                s.playerSpeed *= 0.98;
  // a boost auto-propels you even with no throttle
  if (boosting && s.playerSpeed < s.boostPower)
    s.playerSpeed = Math.min(s.playerSpeed + 0.04, s.boostPower);

  let steerInput = 0;
  if (Math.abs(s.playerSpeed) > 0.01) {
    const dir = s.playerSpeed >= 0 ? 1 : -1;
    if (keys['a']) { s.playerRot += 0.05 * dir; steerInput = 1; }
    if (keys['d']) { s.playerRot -= 0.05 * dir; steerInput = -1; }
  }

  // ── drift + mini-turbo (hold Shift while turning at speed) ──
  const wantDrift = keys['shift'] && s.playerSpeed > 0.25;
  if (wantDrift && (steerInput !== 0 || s.drifting)) {
    if (!s.drifting) { s.drifting = true; s.driftDir = steerInput || s.driftDir; }
    s.playerRot += s.driftDir * 0.025; // tighter, biased turn
    s.playerSpeed *= 0.997;            // slight scrub
    s.driftCharge++;
    if (s.driftCharge > 20 && Math.random() < 0.9) {
      const tier = s.driftCharge > 120 ? 2 : (s.driftCharge > 60 ? 1 : 0);
      const sparkColor = [0x3b82f6, 0xf97316, 0xa855f7][tier];
      const rx = s.playerPos.x - Math.sin(s.playerRot) * 1.2;
      const rz = s.playerPos.z - Math.cos(s.playerRot) * 1.2;
      spawnParticle(rx, groundY(rx, rz, s.idx) + 0.35, rz, sparkColor, 0.5, 0.12, 0.06);
    }
  } else if (s.drifting) {
    const c = s.driftCharge; // release → reward by charge tier
    if (c > 120)     { s.boostTimer = 80; s.boostPower = 0.85; s.boostColor = 0xa855f7; showEffect('🟣 SUPER MINI-TURBO!'); }
    else if (c > 60) { s.boostTimer = 55; s.boostPower = 0.72; s.boostColor = 0xf97316; showEffect('🟠 MINI-TURBO!'); }
    else if (c > 30) { s.boostTimer = 35; s.boostPower = 0.62; s.boostColor = 0x3b82f6; }
    s.drifting = false; s.driftCharge = 0;
  }

  const p = s.playerPos;
  p.x += Math.sin(s.playerRot) * s.playerSpeed;
  p.z += Math.cos(s.playerRot) * s.playerSpeed;

  const idx = nearestIndex(p.x, p.z, s.lastIdx);
  if (clampToRoad(p, idx)) s.playerSpeed *= -0.4; // wall bounce
  s.idx = idx;

  playerKart.position.set(p.x, groundY(p.x, p.z, idx), p.z);
  playerKart.rotation.y = s.playerRot;
  const tiltTarget = s.drifting ? s.driftDir * 0.38 : steerInput * 0.22;
  playerKart.rotation.z += (tiltTarget - playerKart.rotation.z) * 0.2;

  // boost exhaust trail
  if (boosting) {
    const bx = p.x - Math.sin(s.playerRot) * 1.3;
    const bz = p.z - Math.cos(s.playerRot) * 1.3;
    spawnParticle(bx, groundY(bx, bz, idx) + 0.45, bz, s.boostColor, 0.35, 0.18, 0.05);
  }

  advanceLap(s, idx);
}

// ── AI ──
function updateAI() {
  aiTimer += 0.016;
  gameState.aiKarts.forEach((ai, k) => {
    // spun out: spin in place, no progress
    if (ai.spinTimer > 0) {
      ai.spinTimer--;
      ai.speed *= 0.9;
      ai.rot += 0.4;
      ai.pos.x += Math.sin(ai.rot) * ai.speed;
      ai.pos.z += Math.cos(ai.rot) * ai.speed;
      const sidx = nearestIndex(ai.pos.x, ai.pos.z, ai.lastIdx);
      clampToRoad(ai.pos, sidx); ai.idx = sidx;
      aiMeshes[k].position.set(ai.pos.x, groundY(ai.pos.x, ai.pos.z, sidx), ai.pos.z);
      aiMeshes[k].rotation.y = ai.rot;
      advanceLap(ai, sidx);
      return;
    }
    // aim a bit further ahead with a cleaner racing line (less weave)
    const lookAhead = 12;
    const ti = (ai.idx + lookAhead) % N;
    const weave = Math.sin(aiTimer * 0.6 + k * 2) * 2;
    const tc = center[ti], tn = normal[ti];
    const tx = tc.x + tn.x * weave;
    const tz = tc.z + tn.z * weave;

    const desired = Math.atan2(tx - ai.pos.x, tz - ai.pos.z);
    let diff = desired - ai.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ai.rot += diff * 0.12; // sharper, more confident steering

    let cap = ai.baseSpeed;
    if (ai.boostTimer > 0) { ai.boostTimer--; cap = Math.max(cap, ai.boostPower); ai.speed += 0.03; }
    else ai.speed += 0.01;
    // rubber-band: speed up when trailing the player (up to +24%)
    const behind = (gameState.lap * N + gameState.idx) - (ai.lap * N + ai.idx);
    if (behind > 0) cap *= 1 + Math.min(behind / (N * 0.6), 0.24);
    if (ai.speed > cap) ai.speed = cap;
    ai.speed *= 0.985;

    ai.pos.x += Math.sin(ai.rot) * ai.speed;
    ai.pos.z += Math.cos(ai.rot) * ai.speed;

    const idx = nearestIndex(ai.pos.x, ai.pos.z, ai.lastIdx);
    if (clampToRoad(ai.pos, idx)) ai.speed *= 0.5;
    ai.idx = idx;

    aiMeshes[k].position.set(ai.pos.x, groundY(ai.pos.x, ai.pos.z, idx), ai.pos.z);
    aiMeshes[k].rotation.y = ai.rot;

    advanceLap(ai, idx);
  });
}

// ── camera (smooth third-person follow) ──
function updateCamera() {
  const s = gameState;
  const py = groundY(s.playerPos.x, s.playerPos.z, s.idx); // follow the kart up and down hills
  camTarget.set(
    s.playerPos.x + Math.sin(s.playerRot + Math.PI) * CAMERA_DISTANCE,
    py + CAMERA_HEIGHT,
    s.playerPos.z + Math.cos(s.playerRot + Math.PI) * CAMERA_DISTANCE
  );
  if (!camInit) { camera.position.copy(camTarget); camInit = true; }
  else camera.position.lerp(camTarget, 0.1);
  camera.lookAt(s.playerPos.x, py + 1, s.playerPos.z);
}

// ── boot ──
export function init() {
  setupLights();
  buildWorld();
  buildItemBoxes();

  initState();
  playerKart = buildKartMesh(0x7c3aed);
  playerKart.position.set(gameState.playerPos.x, groundY(gameState.playerPos.x, gameState.playerPos.z, gameState.idx), gameState.playerPos.z);
  playerKart.rotation.y = gameState.playerRot;
  loadPlayerModel(playerKart); // replace boxes with the Mario Kart toy model

  aiMeshes = gameState.aiKarts.map((ai, i) => {
    const m = buildKartMesh(ai.color);
    m.position.set(ai.pos.x, groundY(ai.pos.x, ai.pos.z, ai.idx), ai.pos.z);
    m.rotation.y = ai.rot;
    loadColladaKart(m, AI_MODEL_PATHS[i % AI_MODEL_PATHS.length], AI_MODEL_FACING, AI_MODEL_LENGTH);
    return m;
  });

  setupEventListeners();
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (!gameState.gameOver) {
    updatePlayer();
    updateAI();
    updateItemBoxes(now);
    updateHazards(now);
    updateCamera();
    updateHUD();
  }
  updateParticles(); // keep running so final bursts finish
  renderer.render(scene, camera);
}
