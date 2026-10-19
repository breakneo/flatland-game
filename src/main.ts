import { EscapeGameController } from '../assets/sub_gameplay/scripts/controllers/EscapeGameController';
import { project3DtoIso } from '../assets/main/scripts/core/render/OmniscientProjection';

const omniCanvas = document.getElementById('omni-canvas') as HTMLCanvasElement;
const subjCanvas = document.getElementById('subj-canvas') as HTMLCanvasElement;
const omniCtx = omniCanvas.getContext('2d')!;
const subjCtx = subjCanvas.getContext('2d')!;

const mercuryBar = document.getElementById('mercury-bar')!;
const dialogueStrip = document.getElementById('dialogue-strip')!;
const btnAscend = document.getElementById('btn-ascend') as HTMLButtonElement;
const modalOverlay = document.getElementById('modal-overlay')!;
const modalTitle = document.getElementById('modal-title')!;
const modalBody = document.getElementById('modal-body')!;
const btnModalAction = document.getElementById('btn-modal-action') as HTMLButtonElement;
const gameFrame = document.getElementById('game-frame')!;

const btnUp = document.getElementById('btn-up')!;
const btnDown = document.getElementById('btn-down')!;
const btnLeft = document.getElementById('btn-left')!;
const btnRight = document.getElementById('btn-right')!;

const game = new EscapeGameController();

// 3 Oracle fragments scattered in room to collect
interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}
const fragments: Fragment[] = [
  { x: -5, y: -5, collected: false },
  { x: 5, y: -5, collected: false },
  { x: -5, y: 5, collected: false },
];

const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') {
    handleAscend();
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function setupButton(btn: HTMLElement, key: string): void {
  btn.addEventListener('mousedown', () => { keys[key] = true; });
  btn.addEventListener('mouseup', () => { keys[key] = false; });
  btn.addEventListener('mouseleave', () => { keys[key] = false; });
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
}

setupButton(btnUp, 'w');
setupButton(btnDown, 's');
setupButton(btnLeft, 'a');
setupButton(btnRight, 'd');

function handleAscend(): void {
  const success = game.requestAscension();
  if (success) {
    dialogueStrip.textContent = '“你念出了真言，从平面之中拔地而起！”';
  }
}

btnAscend.addEventListener('click', handleAscend);

btnModalAction.addEventListener('click', () => {
  modalOverlay.classList.remove('active');
  game.reset();
  for (const f of fragments) f.collected = false;
  dialogueStrip.textContent = '“四面高墙将你锁在平面，何不抬头？”';
});

// Main Loop
let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // 1. Process Input
  let forward = 0;
  let turn = 0;
  if (keys['w'] || keys['arrowup']) forward += 1;
  if (keys['s'] || keys['arrowdown']) forward -= 1;
  if (keys['a'] || keys['arrowleft']) turn -= 1;
  if (keys['d'] || keys['arrowright']) turn += 1;

  game.movePlayer(forward, turn, dt);

  // 2. Fragment Collection
  for (const f of fragments) {
    if (!f.collected) {
      const d = Math.hypot(game.player.x - f.x, game.player.y - f.y);
      if (d < 1.2) {
        f.collected = true;
        game.addEnergy(35);
      }
    }
  }

  // 3. Update Controller & Juice
  const { isNearMiss, isFrozen } = game.update(dt);
  if (isNearMiss) {
    dialogueStrip.textContent = '“注意！等腰士兵的尖角在雾中逼近了你！”';
  }

  // 4. Update UI Elements
  mercuryBar.style.width = `${game.energy}%`;
  if (game.energy >= 100 && !game.isAscended) {
    btnAscend.classList.add('charged');
  } else {
    btnAscend.classList.remove('charged');
  }

  // 5. Handle Modal
  if (game.gameState === 'VICTORY' && !modalOverlay.classList.contains('active')) {
    modalOverlay.classList.add('active');
    modalTitle.textContent = '脱逃成功 · 手稿录';
    modalBody.textContent = game.victoryManuscript;
    btnModalAction.textContent = '翻阅下一卷';
  } else if (game.gameState === 'DEFEATED' && !modalOverlay.classList.contains('active')) {
    modalOverlay.classList.add('active');
    modalTitle.textContent = '身死道消 · 刺杀残局';
    modalBody.textContent = game.defeatManuscript;
    btnModalAction.textContent = '重聚肉身';
  }

  // 6. Camera Screen Shake Apply
  const juiceFrame = game.juice.update(dt);
  gameFrame.style.transform = `translate(${juiceFrame.offsetX}px, ${juiceFrame.offsetY}px)`;

  // 7. Render Views
  renderOmniscientView();
  renderSubjectiveFogView();

  requestAnimationFrame(gameLoop);
}

function renderOmniscientView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 15;
  const scale = 15;

  // Grid background
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.2)';
  omniCtx.lineWidth = 1;
  for (let x = -8; x <= 8; x += 2) {
    const p1 = project3DtoIso({ x, y: -8, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 8, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -8; y <= 8; y += 2) {
    const p1 = project3DtoIso({ x: -8, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 8, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // Draw 4 Stone walls
  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 2.5;
  for (const wall of game.walls) {
    const p1 = project3DtoIso({ x: wall.x1, y: wall.y1, z: 0 }, scale);
    const p2 = project3DtoIso({ x: wall.x2, y: wall.y2, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // Draw Oracle fragments
  for (const f of fragments) {
    if (!f.collected) {
      const p = project3DtoIso({ x: f.x, y: f.y, z: 0 }, scale);
      omniCtx.fillStyle = '#c8963e';
      omniCtx.beginPath();
      omniCtx.arc(cx + p.screenX, cy + p.screenY, 5, 0, Math.PI * 2);
      omniCtx.fill();
    }
  }

  // Draw Exit Portal outside
  const ep = project3DtoIso({ x: game.exit.x, y: game.exit.y, z: 0 }, scale);
  omniCtx.fillStyle = '#d4af37';
  omniCtx.strokeStyle = '#8c6d3b';
  omniCtx.beginPath();
  omniCtx.arc(cx + ep.screenX, cy + ep.screenY, 7, 0, Math.PI * 2);
  omniCtx.fill();
  omniCtx.stroke();

  // Draw Isosceles Soldiers
  omniCtx.fillStyle = '#8b1e1e';
  for (const patrol of game.patrols) {
    const tri = patrol.currentTriangle;
    const a = project3DtoIso({ x: tri.apex.x, y: tri.apex.y, z: 0 }, scale);
    const bl = project3DtoIso({ x: tri.baseLeft.x, y: tri.baseLeft.y, z: 0 }, scale);
    const br = project3DtoIso({ x: tri.baseRight.x, y: tri.baseRight.y, z: 0 }, scale);

    omniCtx.beginPath();
    omniCtx.moveTo(cx + a.screenX, cy + a.screenY);
    omniCtx.lineTo(cx + bl.screenX, cy + bl.screenY);
    omniCtx.lineTo(cx + br.screenX, cy + br.screenY);
    omniCtx.closePath();
    omniCtx.fill();
  }

  // Draw Square Hero with Z elevation
  const sp = project3DtoIso({ x: game.player.x, y: game.player.y, z: game.currentZ }, scale);
  const px = cx + sp.screenX;
  const py = cy + sp.screenY;

  // Shadow under hero when elevated
  if (game.currentZ > 0) {
    const shadowP = project3DtoIso({ x: game.player.x, y: game.player.y, z: 0 }, scale);
    omniCtx.fillStyle = 'rgba(26, 22, 17, 0.3)';
    omniCtx.beginPath();
    omniCtx.arc(cx + shadowP.screenX, cy + shadowP.screenY, 5, 0, Math.PI * 2);
    omniCtx.fill();
  }

  omniCtx.fillStyle = game.currentZ > 0 ? '#c8963e' : '#1a1611';
  omniCtx.beginPath();
  omniCtx.arc(px, py, 5, 0, Math.PI * 2);
  omniCtx.fill();

  // Heading ray
  const hx = game.player.x + Math.cos(game.player.angle) * 2;
  const hy = game.player.y + Math.sin(game.player.angle) * 2;
  const hp = project3DtoIso({ x: hx, y: hy, z: game.currentZ }, scale);
  omniCtx.strokeStyle = '#c8963e';
  omniCtx.lineWidth = 1.5;
  omniCtx.beginPath();
  omniCtx.moveTo(px, py);
  omniCtx.lineTo(cx + hp.screenX, cy + hp.screenY);
  omniCtx.stroke();
}

function renderSubjectiveFogView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  // Foggy parchment horizon
  subjCtx.fillStyle = '#e8dfc8';
  subjCtx.fillRect(0, 0, w, h);

  const rays = game.getFogRays(84);
  const colWidth = w / rays.length;

  for (let i = 0; i < rays.length; i++) {
    const ray = rays[i];
    if (ray.distance < Infinity) {
      // Perspective height
      const colHeight = Math.min(h, (h / (ray.distance * Math.cos(ray.angleOffset))) * 4.0);
      const top = (h - colHeight) / 2;

      const alpha = Math.max(0.12, ray.brightness);
      if (ray.hitType === 'isosceles') {
        subjCtx.fillStyle = `rgba(139, 30, 30, ${alpha})`; // Crimson for isosceles
      } else {
        subjCtx.fillStyle = `rgba(26, 22, 17, ${alpha})`; // Dark ink for walls
      }
      subjCtx.fillRect(i * colWidth, top, colWidth + 0.6, colHeight);
    }
  }

  // Horizon midline
  subjCtx.strokeStyle = 'rgba(140, 109, 59, 0.4)';
  subjCtx.lineWidth = 1;
  subjCtx.beginPath();
  subjCtx.moveTo(0, h / 2);
  subjCtx.lineTo(w, h / 2);
  subjCtx.stroke();

  // 3D Levitation banner if ascended
  if (game.isAscended) {
    subjCtx.font = 'bold 12px serif';
    subjCtx.fillStyle = '#c8963e';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('【高维升空滞空中 · 越过二维屏障】', w / 2, 24);
  }
}

// Start game loop
requestAnimationFrame(gameLoop);
