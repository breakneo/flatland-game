import { EscapeGameController } from '../assets/sub_gameplay/scripts/controllers/EscapeGameController';
import { project3DtoIso } from '../assets/main/scripts/core/render/OmniscientProjection';
import { getSquareVertices } from '../assets/main/scripts/core/geometry/IsoscelesCollider';

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

// 3 Oracle fragments placed strategically:
// 1. Safe tutorial fragment right ahead of spawn (-4.8, 0)
// 2. Midfield fragment between patrol corridors
// 3. Gatekeeper fragment near eastern barrier
interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}
const fragments: Fragment[] = [
  { x: -3.0, y: 0, collected: false },
  { x: 1.0, y: -0.5, collected: false },
  { x: 3.5, y: 0.0, collected: false },
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
    dialogueStrip.textContent = '“你念出了第三维真言，正方形之躯拔地而起，俯瞰一切凡俗之墙！”';
  } else {
    dialogueStrip.textContent = '“心智尚未充盈！需探寻集齐 3 枚神谕残片方可参悟飞升！”';
  }
}

btnAscend.addEventListener('click', handleAscend);

btnModalAction.addEventListener('click', () => {
  modalOverlay.classList.remove('active');
  game.reset();
  for (const f of fragments) f.collected = false;
  dialogueStrip.textContent = '“【正方形绅士】四面石墙将你锁在平面。请沿走廊前行，拾取前方神谕碎片！”';
});

// Set initial welcoming quote
dialogueStrip.textContent = '“【正方形绅士】四面石墙将你锁在平面。请沿走廊前行，拾取前方神谕碎片！”';

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
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!f.collected) {
      const d = Math.hypot(game.player.x - f.x, game.player.y - f.y);
      if (d < 1.2) {
        f.collected = true;
        game.addEnergy(35);
        if (i === 0) {
          dialogueStrip.textContent = '“【神谕初显】四等边平直均等之躯，何必拘泥于平面之锁？”';
        } else if (i === 1) {
          dialogueStrip.textContent = '“【真理渐明】等腰暴徒唯知盲目前冲，不知天地尚有上下！”';
        } else {
          dialogueStrip.textContent = '“【真言充盈】神谕圆满！按‘向上，而不是向北’即刻翻越东墙脱逃！”';
        }
      }
    }
  }

  // 3. Update Controller & Juice
  const { isNearMiss } = game.update(dt);
  if (isNearMiss) {
    dialogueStrip.textContent = '“【锐角警报！】等腰士兵的致命尖角在雾中擦身而过！”';
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
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.18)';
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

  // Draw Oracle fragments (Pulsing Diamond)
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!f.collected) {
      const p = project3DtoIso({ x: f.x, y: f.y, z: 0 }, scale);
      const fx = cx + p.screenX;
      const fy = cy + p.screenY;

      omniCtx.fillStyle = '#d4af37';
      omniCtx.strokeStyle = '#8c6d3b';
      omniCtx.lineWidth = 1.5;
      omniCtx.beginPath();
      omniCtx.moveTo(fx, fy - 6);
      omniCtx.lineTo(fx + 5, fy);
      omniCtx.lineTo(fx, fy + 6);
      omniCtx.lineTo(fx - 5, fy);
      omniCtx.closePath();
      omniCtx.fill();
      omniCtx.stroke();

      // Number badge
      omniCtx.font = 'bold 9px serif';
      omniCtx.fillStyle = '#1a1611';
      omniCtx.textAlign = 'center';
      omniCtx.fillText(`${i + 1}`, fx, fy + 3);
    }
  }

  // Draw Exit Portal outside
  const ep = project3DtoIso({ x: game.exit.x, y: game.exit.y, z: 0 }, scale);
  omniCtx.fillStyle = 'rgba(212, 175, 55, 0.4)';
  omniCtx.strokeStyle = '#d4af37';
  omniCtx.lineWidth = 2;
  omniCtx.beginPath();
  omniCtx.arc(cx + ep.screenX, cy + ep.screenY, 8, 0, Math.PI * 2);
  omniCtx.fill();
  omniCtx.stroke();
  omniCtx.font = '10px serif';
  omniCtx.fillStyle = '#8c6d3b';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('神域脱逃口', cx + ep.screenX, cy + ep.screenY - 10);

  // Draw Isosceles Soldiers with piercing heading
  for (const patrol of game.patrols) {
    const tri = patrol.currentTriangle;
    const a = project3DtoIso({ x: tri.apex.x, y: tri.apex.y, z: 0 }, scale);
    const bl = project3DtoIso({ x: tri.baseLeft.x, y: tri.baseLeft.y, z: 0 }, scale);
    const br = project3DtoIso({ x: tri.baseRight.x, y: tri.baseRight.y, z: 0 }, scale);

    const ax = cx + a.screenX;
    const ay = cy + a.screenY;
    const blx = cx + bl.screenX;
    const bly = cy + bl.screenY;
    const brx = cx + br.screenX;
    const bry = cy + br.screenY;

    // Triangle body
    omniCtx.fillStyle = 'rgba(139, 30, 30, 0.88)';
    omniCtx.strokeStyle = '#4a0e0e';
    omniCtx.lineWidth = 1.5;
    omniCtx.beginPath();
    omniCtx.moveTo(ax, ay);
    omniCtx.lineTo(blx, bly);
    omniCtx.lineTo(brx, bry);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // Sharp apex red point
    omniCtx.fillStyle = '#ff2222';
    omniCtx.beginPath();
    omniCtx.arc(ax, ay, 2.5, 0, Math.PI * 2);
    omniCtx.fill();
  }

  // ========================================================
  // RENDER TRUE SQUARE HERO (正方形绅士真容渲染)
  // ========================================================
  const squareVerts2D = getSquareVertices(
    { x: game.player.x, y: game.player.y },
    game.player.size,
    game.player.angle
  );

  // Ground projected points (Z = 0)
  const groundPoints = squareVerts2D.map((pt) => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  // Elevated points (Z = game.currentZ)
  const airPoints = squareVerts2D.map((pt) => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: game.currentZ }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  if (game.currentZ > 0) {
    // 1. Draw ground shadow square
    omniCtx.fillStyle = 'rgba(26, 22, 17, 0.28)';
    omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.5)';
    omniCtx.lineWidth = 1;
    omniCtx.setLineDash([3, 3]);
    omniCtx.beginPath();
    omniCtx.moveTo(groundPoints[0].x, groundPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(groundPoints[i].x, groundPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();
    omniCtx.setLineDash([]);

    // 2. Draw 4 3D vertical pillar edges
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    omniCtx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      omniCtx.beginPath();
      omniCtx.moveTo(groundPoints[i].x, groundPoints[i].y);
      omniCtx.lineTo(airPoints[i].x, airPoints[i].y);
      omniCtx.stroke();
    }

    // 3. Draw elevated glowing golden square in air
    omniCtx.fillStyle = 'rgba(244, 219, 133, 0.85)';
    omniCtx.strokeStyle = '#d4af37';
    omniCtx.lineWidth = 2.5;
    omniCtx.beginPath();
    omniCtx.moveTo(airPoints[0].x, airPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(airPoints[i].x, airPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // Floating tag
    const centerPoint = project3DtoIso(
      { x: game.player.x, y: game.player.y, z: game.currentZ },
      scale
    );
    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#b38022';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('【高维正方体·飞升中】', cx + centerPoint.screenX, cy + centerPoint.screenY - 14);
  } else {
    // Ground 2D Square Gentleman
    omniCtx.fillStyle = '#1c2733'; // Ink Navy scholar robe
    omniCtx.strokeStyle = '#c8963e'; // Victorian gilded square edges
    omniCtx.lineWidth = 2.2;
    omniCtx.beginPath();
    omniCtx.moveTo(groundPoints[0].x, groundPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(groundPoints[i].x, groundPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // Inner concentric square for gentleman texture
    const innerVerts = getSquareVertices(
      { x: game.player.x, y: game.player.y },
      game.player.size * 0.5,
      game.player.angle
    );
    const innerPoints = innerVerts.map((pt) => {
      const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
      return { x: cx + p.screenX, y: cy + p.screenY };
    });
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    omniCtx.lineWidth = 1;
    omniCtx.beginPath();
    omniCtx.moveTo(innerPoints[0].x, innerPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(innerPoints[i].x, innerPoints[i].y);
    omniCtx.closePath();
    omniCtx.stroke();

    // Square label tag
    const centerPoint = project3DtoIso(
      { x: game.player.x, y: game.player.y, z: 0 },
      scale
    );
    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#1a2634';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('正方形绅士', cx + centerPoint.screenX, cy + centerPoint.screenY - 12);
  }

  // Heading pointer line from square center
  const centerP = project3DtoIso({ x: game.player.x, y: game.player.y, z: game.currentZ }, scale);
  const px = cx + centerP.screenX;
  const py = cy + centerP.screenY;
  const hx = game.player.x + Math.cos(game.player.angle) * 1.8;
  const hy = game.player.y + Math.sin(game.player.angle) * 1.8;
  const hp = project3DtoIso({ x: hx, y: hy, z: game.currentZ }, scale);
  omniCtx.strokeStyle = '#d4af37';
  omniCtx.lineWidth = 1.8;
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
      const colHeight = Math.min(h - 40, (h / (ray.distance * Math.cos(ray.angleOffset))) * 3.8);
      const top = (h - 30 - colHeight) / 2;

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
  subjCtx.moveTo(0, (h - 30) / 2);
  subjCtx.lineTo(w, (h - 30) / 2);
  subjCtx.stroke();

  // ========================================================
  // SQUARE GENTLEMAN 1ST-PERSON FOREGROUND HUD
  // (正方形身躯前沿视界 HUD：90° 直角与平直外壁刻度)
  // ========================================================
  const hudY = h - 34;

  // Background frame
  subjCtx.fillStyle = 'rgba(26, 38, 52, 0.9)';
  subjCtx.fillRect(0, hudY, w, 34);

  // Gilded border representing straight square edge
  subjCtx.strokeStyle = '#c8963e';
  subjCtx.lineWidth = 2.5;
  subjCtx.beginPath();
  subjCtx.moveTo(0, hudY);
  subjCtx.lineTo(w, hudY);
  subjCtx.stroke();

  // Left 90° corner marker
  subjCtx.strokeStyle = '#d4af37';
  subjCtx.lineWidth = 2;
  subjCtx.strokeRect(10, hudY + 6, 12, 12);
  subjCtx.font = '9px serif';
  subjCtx.fillStyle = '#f4eedb';
  subjCtx.textAlign = 'left';
  subjCtx.fillText('左直角 90°', 26, hudY + 16);

  // Right 90° corner marker
  subjCtx.strokeRect(w - 22, hudY + 6, 12, 12);
  subjCtx.textAlign = 'right';
  subjCtx.fillText('右直角 90°', w - 26, hudY + 16);

  // Center HUD compass and heading
  const deg = Math.round((((game.player.angle * 180) / Math.PI) % 360 + 360) % 360);
  subjCtx.font = 'bold 11px serif';
  subjCtx.fillStyle = '#d4af37';
  subjCtx.textAlign = 'center';
  subjCtx.fillText(`【正方形平直前沿视界 · 方位 ${deg}°】`, w / 2, hudY + 20);

  // 3D Levitation banner if ascended
  if (game.isAscended) {
    subjCtx.fillStyle = 'rgba(212, 175, 55, 0.92)';
    subjCtx.fillRect(w / 2 - 120, 6, 240, 24);
    subjCtx.strokeStyle = '#8c6d3b';
    subjCtx.strokeRect(w / 2 - 120, 6, 240, 24);

    subjCtx.font = 'bold 11px serif';
    subjCtx.fillStyle = '#1a1611';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('【高维跃迁滞空中 · 越过二维屏障】', w / 2, 22);
  }
}

// Start game loop
requestAnimationFrame(gameLoop);

// Start game loop
requestAnimationFrame(gameLoop);
