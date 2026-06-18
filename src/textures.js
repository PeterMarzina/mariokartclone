// Procedurally drawn canvas textures so the game needs no image assets.
import * as THREE from 'three';

export function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#3a3a3e'; x.fillRect(0, 0, 128, 128);
  // subtle asphalt speckle
  for (let i = 0; i < 600; i++) {
    x.fillStyle = Math.random() > 0.5 ? '#444448' : '#333337';
    x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  // white solid edge lines
  x.fillStyle = '#e8e8e8';
  x.fillRect(6, 0, 7, 128);
  x.fillRect(115, 0, 7, 128);
  // yellow dashed center line
  x.fillStyle = '#f2d44a';
  x.fillRect(60, 8, 8, 44);
  x.fillRect(60, 76, 8, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function wallTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#d12b2b'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#f5f5f5'; x.fillRect(0, 32, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function grassTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#4f8f3a'; x.fillRect(0, 0, 128, 128);
  // mowed stadium stripes
  for (let i = 0; i < 128; i += 16) {
    x.fillStyle = (i / 16) % 2 ? '#54983f' : '#467f33';
    x.fillRect(0, i, 128, 16);
  }
  // grass speckle
  for (let i = 0; i < 500; i++) {
    x.fillStyle = Math.random() > 0.5 ? '#3f7a30' : '#5ca546';
    x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 80);
  return tex;
}

export function itemBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, '#ffe14d'); g.addColorStop(1, '#ff9500');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.lineWidth = 8; x.strokeStyle = '#7a4a00'; x.strokeRect(7, 7, 114, 114);
  x.fillStyle = '#7a4a00';
  [[20, 20], [108, 20], [20, 108], [108, 108]].forEach(([rx, ry]) => {
    x.beginPath(); x.arc(rx, ry, 5, 0, 7); x.fill();
  });
  x.fillStyle = '#fff';
  x.font = 'bold 92px Arial';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('?', 64, 70);
  return new THREE.CanvasTexture(c);
}
