// Keyboard input. `keys` holds the live held-key state read by the game loop.
import { onResize } from './scene.js';
import { useItem } from './items.js';

export const keys = {};
const keyMap = { 'arrowup': 'w', 'arrowdown': 's', 'arrowleft': 'a', 'arrowright': 'd' };

export function setupEventListeners() {
  window.addEventListener('keydown', (e) => {
    let k = e.key.toLowerCase(); if (keyMap[k]) k = keyMap[k];
    keys[k] = true;
    if (['w', 'a', 's', 'd', ' '].includes(k)) e.preventDefault();
    if (k === ' ' && !e.repeat) useItem(); // fire held item (once per press)
  });
  window.addEventListener('keyup', (e) => {
    let k = e.key.toLowerCase(); if (keyMap[k]) k = keyMap[k];
    keys[k] = false;
  });
  window.addEventListener('resize', onResize);
}
