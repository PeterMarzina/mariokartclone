// Scene, camera, renderer and lighting — the rendering foundation.
import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 120, 420);

export const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 2000);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

export function setupLights() {
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a7a3a, 0.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
  sun.position.set(120, 200, -40);
  sun.target.position.set(0, 0, -130); // aim at circuit center
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 300;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
}

export function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
