// Kart meshes: the simple box kart (placeholder) and the COLLADA model loader
// that swaps a real kart model onto a group once it finishes downloading.
import * as THREE from 'three';
import { ColladaLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/ColladaLoader.js';
import { scene } from './scene.js';
import { PLAYER_MODEL_PATH, PLAYER_MODEL_FACING, PLAYER_MODEL_LENGTH } from './config.js';

export function buildKartMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }));
  body.position.y = 0.45; body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.4 }));
  cabin.position.set(0, 0.85, 0.1); cabin.castShadow = true;
  group.add(cabin);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 14);
  [[-0.7, -0.65], [0.7, -0.65], [-0.7, 0.65], [0.7, 0.65]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.32, z);
    w.castShadow = true;
    group.add(w);
  });
  scene.add(group);
  return group;
}

const loader = new ColladaLoader();

// Load a COLLADA kart and swap it in for a group's placeholder boxes.
// The box kart stays visible until the model finishes loading. `facing` is a
// yaw tweak; `length` is the world length the model is auto-scaled to.
export function loadColladaKart(group, path, facing, length) {
  loader.load(path, (collada) => {
    const model = collada.scene;
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) o.material.side = THREE.FrontSide;
      }
    });

    // wrapper keeps the loader's up-axis conversion intact while we add a yaw
    const holder = new THREE.Group();
    holder.add(model);

    // auto-scale to a consistent kart length, whatever the source units are
    const pre = new THREE.Box3().setFromObject(model);
    const size = pre.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    holder.scale.setScalar(length / maxDim);
    holder.rotation.y = facing;

    // recenter on x/z and drop onto the ground
    const box = new THREE.Box3().setFromObject(holder);
    const c = box.getCenter(new THREE.Vector3());
    holder.position.x -= c.x;
    holder.position.z -= c.z;
    holder.position.y -= box.min.y;

    // remove the placeholder boxes, keep the group (physics uses it)
    for (let i = group.children.length - 1; i >= 0; i--) group.remove(group.children[i]);
    group.add(holder);
  },
  undefined,
  (err) => console.warn('Kart model failed to load (serve over http://, not file://):', path, err));
}

export function loadPlayerModel(group) {
  loadColladaKart(group, PLAYER_MODEL_PATH, PLAYER_MODEL_FACING, PLAYER_MODEL_LENGTH);
}
