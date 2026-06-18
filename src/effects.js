// Particle bursts/trails and the big on-screen power-up banner.
import * as THREE from 'three';
import { scene } from './scene.js';

const particles = [];
const PARTICLE_GEO = new THREE.SphereGeometry(0.35, 6, 6);

export function spawnParticle(x, y, z, color, spread, up, decay) {
  const m = new THREE.Mesh(PARTICLE_GEO, new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  scene.add(m);
  particles.push({
    mesh: m,
    vx: (Math.random() - 0.5) * spread,
    vy: Math.random() * up + 0.04,
    vz: (Math.random() - 0.5) * spread,
    life: 1,
    decay: decay
  });
}

export function burst(x, y, z, color, count = 26) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x, y, z, color, 0.7, 0.35, 0.02 + Math.random() * 0.025);
  }
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.mesh.position.x += p.vx;
    p.mesh.position.y += p.vy;
    p.mesh.position.z += p.vz;
    p.vy -= 0.013; // gravity
    p.life -= p.decay;
    p.mesh.scale.setScalar(Math.max(p.life, 0.001));
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}

const effectEl = document.getElementById('effect');
export function showEffect(label) {
  effectEl.textContent = label;
  effectEl.classList.remove('show');
  void effectEl.offsetWidth; // restart the animation
  effectEl.classList.add('show');
}
