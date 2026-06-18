// Static world geometry: ground, road, walls, apron, grass embankments,
// start line and trees. Everything follows the track's hilly elevation
// (center[i].y) via a single `ribbon` helper.
import * as THREE from 'three';
import { scene } from './scene.js';
import { N, ROAD_HALF, WALL_OFF, WALL_H } from './config.js';
import { center, tangent, normal, nearestIndex } from './track.js';
import { roadTexture, wallTexture, grassTexture } from './textures.js';

const HW    = ROAD_HALF + 4; // apron half-width (road shoulder)
const SKIRT = HW + 6;        // outer edge of the grass skirt (kept narrow so it
                             // never folds over itself where the loop runs close)

// Build a strip between two edges that run along the centerline. Each edge is a
// function(i) -> { off, y }: `off` is lateral offset from the centerline,
// `y` is the height offset added on top of the road height center[i].y.
function ribbon(edgeA, edgeB, material, tileLen) {
  const pos = [], uv = [], idx = [];
  let cum = 0;
  for (let i = 0; i <= N; i++) {
    const ii = i % N;
    const c = center[ii], n = normal[ii];
    const a = edgeA(ii), b = edgeB(ii);
    pos.push(c.x + n.x * a.off, c.y + a.y, c.z + n.z * a.off);
    pos.push(c.x + n.x * b.off, c.y + b.y, c.z + n.z * b.off);
    const v = tileLen ? cum / tileLen : 0;
    uv.push(0, v, 1, v);
    if (i < N) {
      const nx = center[(ii + 1) % N];
      cum += Math.hypot(nx.x - c.x, nx.z - c.z);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function buildRoad() {
  // DoubleSide so the surface never disappears when viewed across a hill crest
  const mat = new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95, side: THREE.DoubleSide });
  ribbon(() => ({ off: ROAD_HALF, y: 0.06 }), () => ({ off: -ROAD_HALF, y: 0.06 }), mat, 9);
}

function buildApron() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xcBae6b, roughness: 1, side: THREE.DoubleSide });
  ribbon(() => ({ off: HW, y: 0 }), () => ({ off: -HW, y: 0 }), mat, 0);
}

// short grass skirt from the elevated shoulder down to ground level (y = -0.5)
function buildSkirts() {
  const matL = new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 1, side: THREE.DoubleSide });
  const matR = matL.clone();
  ribbon(() => ({ off: HW, y: 0 }),  i => ({ off: SKIRT, y: -center[i].y - 0.5 }),  matL, 0);
  ribbon(() => ({ off: -HW, y: 0 }), i => ({ off: -SKIRT, y: -center[i].y - 0.5 }), matR, 0);
}

function buildWalls() {
  const matL = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.8, side: THREE.DoubleSide });
  const matR = matL.clone();
  matR.map = wallTexture();
  // each wall is a vertical strip: same lateral offset, bottom y=0 → top y=WALL_H
  const mkL = (off, y) => ({ off, y });
  ribbon(() => mkL(WALL_OFF, 0),  () => mkL(WALL_OFF, WALL_H),  matL, 4).castShadow = true;
  ribbon(() => mkL(-WALL_OFF, 0), () => mkL(-WALL_OFF, WALL_H), matR, 4).castShadow = true;
}

function buildGround() {
  const g = new THREE.PlaneGeometry(2000, 2000);
  const mat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 });
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.5;
  m.receiveShadow = true;
  scene.add(m);
}

function buildStartLine() {
  // checkered start/finish strip across the road at index 0
  const c = center[0], t = tangent[0];
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 16;
  const x = cv.getContext('2d');
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 2; j++) {
      x.fillStyle = (i + j) % 2 ? '#111' : '#fff';
      x.fillRect(i * 8, j * 8, 8, 8);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  const g = new THREE.PlaneGeometry(ROAD_HALF * 2, 4);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex }));
  m.position.set(c.x, c.y + 0.07, c.z);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.atan2(t.x, t.z);
  scene.add(m);
}

function buildTrees() {
  const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
  const leafGeo  = new THREE.ConeGeometry(3, 7, 8);
  const leafMat  = new THREE.MeshStandardMaterial({ color: 0x2f7d32, flatShading: true });

  let placed = 0, tries = 0;
  while (placed < 70 && tries < 1800) {
    tries++;
    const px = (Math.random() - 0.5) * 480;
    const pz = (Math.random() - 0.5) * 480 - 130;
    const ni = nearestIndex(px, pz, -1);
    const dx = px - center[ni].x, dz = pz - center[ni].z;
    const dist = Math.hypot(dx, dz);
    if (dist < SKIRT + 8 || dist > 240) continue; // keep clear of the track/skirt
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5; trunk.castShadow = true;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = 6; leaf.castShadow = true;
    const s = 0.7 + Math.random() * 0.9;
    tree.add(trunk); tree.add(leaf);
    tree.scale.setScalar(s);
    tree.position.set(px, 0, pz);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
    placed++;
  }
}

// Build the whole static environment in one call.
export function buildWorld() {
  buildGround();
  buildSkirts();
  buildApron();
  buildRoad();
  buildWalls();
  buildStartLine();
  buildTrees();
}
