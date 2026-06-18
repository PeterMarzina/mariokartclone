// On-screen HUD (lap / speed / item / standings) and the game-over screen.
import { N, TOTAL_LAPS } from './config.js';
import { gameState, raceStartTime } from './state.js';

const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameOverScreen');

function progressOf(lap, idx) { return lap * N + idx; }

export function updateHUD() {
  const s = gameState;
  const speed = Math.abs(s.playerSpeed).toFixed(2);
  const racers = [
    { name: 'YOU', lap: s.lap, prog: progressOf(s.lap, s.idx) },
    { name: s.aiKarts[0].name, lap: s.aiKarts[0].lap, prog: progressOf(s.aiKarts[0].lap, s.aiKarts[0].idx) },
    { name: s.aiKarts[1].name, lap: s.aiKarts[1].lap, prog: progressOf(s.aiKarts[1].lap, s.aiKarts[1].idx) }
  ];
  racers.sort((a, b) => b.prog - a.prog);
  const place = racers.findIndex(r => r.name === 'YOU') + 1;
  const suffix = ['st', 'nd', 'rd'][place - 1] || 'th';

  const itemIcon = s.heldItem === 'banana' ? '🍌'
                 : s.heldItem === 'shell'  ? '🐢' : '—';

  hud.innerHTML =
    `🏎️ MARIO KART 3D<br>` +
    `Lap: ${Math.min(s.lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}<br>` +
    `Speed: ${speed}<br>` +
    `Item: ${itemIcon}<br>` +
    `Position: ${place}${suffix}/${racers.length}<br>` +
    `<small>${racers.map((r, i) => `${i + 1}. ${r.name} (lap ${Math.min(r.lap + 1, TOTAL_LAPS)})`).join('<br>')}</small>`;
}

export function showGameOver(playerWon, aiName) {
  const time = ((Date.now() - raceStartTime) / 1000).toFixed(1);
  gameOverScreen.style.display = 'flex';
  gameOverScreen.innerHTML = playerWon
    ? `<h1>🏆 YOU WIN!</h1><p>Finished in ${time}s</p><button id="restartBtn">RESTART</button>`
    : `<h1>💀 ${aiName} WINS</h1><p>Better luck next time! (${time}s)</p><button id="restartBtn">RESTART</button>`;
  document.getElementById('restartBtn').addEventListener('click', () => location.reload());
}
