import { Dimension, getDegreesOfFreedom, canMoveInDirection } from './core/dimension';
import { LevelManager } from './game/level-manager';
import { compute1DSight } from './render/subjective-1d';
import { cast2DHorizonRays, WallSegment } from './render/subjective-2d';
import { project3DtoIso, Vector3 } from './render/omniscient';

// DOM Elements
const omniCanvas = document.getElementById('omniscient-canvas') as HTMLCanvasElement;
const subjCanvas = document.getElementById('subjective-canvas') as HTMLCanvasElement;
const omniCtx = omniCanvas.getContext('2d')!;
const subjCtx = subjCanvas.getContext('2d')!;

const dimBadge = document.getElementById('dim-badge')!;
const levelTitle = document.getElementById('level-title')!;
const dofLabel = document.getElementById('dof-label')!;
const narrativeBox = document.getElementById('narrative-box')!;
const btnAscend = document.getElementById('btn-ascend') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next-level') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

const btnUp = document.getElementById('btn-up') as HTMLButtonElement;
const btnDown = document.getElementById('btn-down') as HTMLButtonElement;
const btnLeft = document.getElementById('btn-left') as HTMLButtonElement;
const btnRight = document.getElementById('btn-right') as HTMLButtonElement;

// Game State
const levelManager = new LevelManager();

let playerPos: Vector3 = { x: 0, y: 0, z: 0 };
let playerAngle: number = 0; // In radians
let soliloquyIndex = 0;

// Level 1: Lineland
const l1Obstacles = [
  { x: 5, colorHex: '#8b1e1e' }, // Crimson neighbor
  { x: -5, colorHex: '#4a6b82' },
];
const l1Exit = { x: 9, y: 0, z: 0 };

// Level 2: Flatland (4 walls)
const l2Walls: WallSegment[] = [
  { x1: 6, y1: -6, x2: 6, y2: 6, color: '#1a1611' },
  { x1: 6, y1: 6, x2: -6, y2: 6, color: '#1a1611' },
  { x1: -6, y1: 6, x2: -6, y2: -6, color: '#1a1611' },
  { x1: -6, y1: -6, x2: 6, y2: -6, color: '#1a1611' },
];
const l2Exit = { x: 10, y: 0, z: 0 };

// Level 3: Spaceland Cubes
const l3Pillars: Vector3[] = [
  { x: 5, y: 5, z: 0 },
  { x: -5, y: 5, z: 0 },
  { x: 5, y: -5, z: 0 },
  { x: -5, y: -5, z: 0 },
];
const l3Exit = { x: 0, y: 12, z: 4 };

function resetPlayer(): void {
  playerPos = { x: 0, y: 0, z: 0 };
  playerAngle = 0;
  updateUI();
}

function updateUI(): void {
  const dim = levelManager.activeDimension;
  const dof = getDegreesOfFreedom(dim);
  const dimName = ['0D (Point)', '1D (Line)', '2D (Plane)', '3D (Space)'][dim];

  dimBadge.textContent = dimName;
  levelTitle.textContent = levelManager.currentLevel.name;

  let dofText = '';
  if (dim === Dimension.D0) dofText = '完全静止 (0 DOF)';
  else if (dim === Dimension.D1) dofText = 'X轴前进/后退 (1 DOF)';
  else if (dim === Dimension.D2) dofText = 'X/Y平面自由 (2 DOF)';
  else if (dim === Dimension.D3) dofText = 'X/Y/Z三维立体 (3 DOF)';

  if (levelManager.isAscended) {
    dofText += ' [已突破升维!]';
  }
  dofLabel.textContent = dofText;

  if (levelManager.isEasterEggActive) {
    subjCanvas.classList.add('pointland-mode');
    narrativeBox.textContent = levelManager.getPointKingSoliloquy(soliloquyIndex);
  } else {
    subjCanvas.classList.remove('pointland-mode');
    narrativeBox.textContent = levelManager.currentLevel.introText;
  }
}

// Input Handling
const keysPressed: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()] = true;

  if (levelManager.isEasterEggActive) {
    soliloquyIndex++;
    updateUI();
    return;
  }

  if (e.code === 'Space') {
    handleAscend();
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

function handleAscend(): void {
  if (levelManager.isEasterEggActive) return;
  levelManager.triggerAscension();
  updateUI();
}

btnAscend.addEventListener('click', handleAscend);
btnReset.addEventListener('click', resetPlayer);
btnNext.addEventListener('click', () => {
  levelManager.completeCurrentLevel();
  resetPlayer();
});

// Touch / Button continuous controls
function setupButtonPress(btn: HTMLElement, key: string): void {
  const press = () => {
    keysPressed[key] = true;
    if (levelManager.isEasterEggActive) {
      soliloquyIndex++;
      updateUI();
    }
  };
  const release = () => {
    keysPressed[key] = false;
  };
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); press(); });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); release(); });
}

setupButtonPress(btnUp, 'w');
setupButtonPress(btnDown, 's');
setupButtonPress(btnLeft, 'a');
setupButtonPress(btnRight, 'd');

// Game Loop Movement Update
function updateMovement(): void {
  if (levelManager.isEasterEggActive) return;

  const dim = levelManager.activeDimension;
  const dof = getDegreesOfFreedom(dim);
  const moveSpeed = 0.12;
  const turnSpeed = 0.04;

  let dx = 0;
  let dy = 0;
  let dz = 0;

  if (dim === Dimension.D1) {
    // 1D: W/S or Arrow moves along X
    if (keysPressed['w'] || keysPressed['arrowup'] || keysPressed['d'] || keysPressed['arrowright']) {
      dx += moveSpeed;
    }
    if (keysPressed['s'] || keysPressed['arrowdown'] || keysPressed['a'] || keysPressed['arrowleft']) {
      dx -= moveSpeed;
    }
    // Obstacle collision in 1D
    const targetX = playerPos.x + dx;
    if (targetX >= 4.5 && targetX <= 5.5 && playerPos.y === 0) {
      dx = 0; // Blocked by neighbor
    }
  } else if (dim === Dimension.D2) {
    // 2D: Turn and Forward/Backward
    if (keysPressed['a'] || keysPressed['arrowleft']) playerAngle -= turnSpeed;
    if (keysPressed['d'] || keysPressed['arrowright']) playerAngle += turnSpeed;

    if (keysPressed['w'] || keysPressed['arrowup']) {
      dx += Math.cos(playerAngle) * moveSpeed;
      dy += Math.sin(playerAngle) * moveSpeed;
    }
    if (keysPressed['s'] || keysPressed['arrowdown']) {
      dx -= Math.cos(playerAngle) * moveSpeed;
      dy -= Math.sin(playerAngle) * moveSpeed;
    }

    // Wall collision in 2D if not ascended to 3D
    if (!levelManager.isAscended && levelManager.currentLevel.id === 2) {
      const nextX = playerPos.x + dx;
      const nextY = playerPos.y + dy;
      if (Math.abs(nextX) >= 5.6 || Math.abs(nextY) >= 5.6) {
        dx = 0;
        dy = 0;
      }
    }
  } else if (dim === Dimension.D3) {
    // 3D: Move in X/Y and ascend in Z
    if (keysPressed['a'] || keysPressed['arrowleft']) playerAngle -= turnSpeed;
    if (keysPressed['d'] || keysPressed['arrowright']) playerAngle += turnSpeed;

    if (keysPressed['w'] || keysPressed['arrowup']) {
      dx += Math.cos(playerAngle) * moveSpeed;
      dy += Math.sin(playerAngle) * moveSpeed;
    }
    if (keysPressed['s'] || keysPressed['arrowdown']) {
      dx -= Math.cos(playerAngle) * moveSpeed;
      dy -= Math.sin(playerAngle) * moveSpeed;
    }

    if (keysPressed[' ']) {
      dz += moveSpeed;
    }
    if (keysPressed['shift']) {
      dz -= moveSpeed;
    }
  }

  const delta = { x: dx, y: dy, z: dz };
  if (canMoveInDirection(dim, delta)) {
    playerPos.x += dx;
    playerPos.y += dy;
    playerPos.z += dz;
  }

  // Check Level Exit Trigger
  checkExitTrigger();
}

function checkExitTrigger(): void {
  const currentLevelId = levelManager.currentLevel.id;
  let distToExit = Infinity;

  if (currentLevelId === 1) {
    distToExit = Math.hypot(playerPos.x - l1Exit.x, playerPos.y - l1Exit.y);
  } else if (currentLevelId === 2) {
    distToExit = Math.hypot(playerPos.x - l2Exit.x, playerPos.y - l2Exit.y);
  } else if (currentLevelId === 3) {
    distToExit = Math.hypot(playerPos.x - l3Exit.x, playerPos.y - l3Exit.y, playerPos.z - l3Exit.z);
  }

  if (distToExit < 1.2) {
    levelManager.completeCurrentLevel();
    resetPlayer();
  }
}

// Rendering Functions
function renderOmniscientView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 30;
  const scale = 14;

  // Antique Grid Lines
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.2)';
  omniCtx.lineWidth = 1;
  for (let x = -10; x <= 10; x += 2) {
    const p1 = project3DtoIso({ x, y: -10, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 10, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -10; y <= 10; y += 2) {
    const p1 = project3DtoIso({ x: -10, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 10, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  const levelId = levelManager.currentLevel.id;

  // Level 1: Draw Lineland Axis & Obstacles
  if (levelId === 1) {
    const start = project3DtoIso({ x: -10, y: 0, z: 0 }, scale);
    const end = project3DtoIso({ x: 10, y: 0, z: 0 }, scale);
    omniCtx.strokeStyle = '#1a1611';
    omniCtx.lineWidth = 2;
    omniCtx.beginPath();
    omniCtx.moveTo(cx + start.screenX, cy + start.screenY);
    omniCtx.lineTo(cx + end.screenX, cy + end.screenY);
    omniCtx.stroke();

    for (const obs of l1Obstacles) {
      const p = project3DtoIso({ x: obs.x, y: 0, z: 0 }, scale);
      omniCtx.fillStyle = obs.colorHex;
      omniCtx.beginPath();
      omniCtx.arc(cx + p.screenX, cy + p.screenY, 5, 0, Math.PI * 2);
      omniCtx.fill();
      omniCtx.stroke();
    }

    // Exit portal
    const ep = project3DtoIso(l1Exit, scale);
    drawPortal(cx + ep.screenX, cy + ep.screenY, 'rgba(200, 150, 62, 0.8)');
  }

  // Level 2: Draw Flatland Walls
  if (levelId === 2) {
    omniCtx.strokeStyle = '#1a1611';
    omniCtx.lineWidth = 2.5;
    for (const wall of l2Walls) {
      const p1 = project3DtoIso({ x: wall.x1, y: wall.y1, z: 0 }, scale);
      const p2 = project3DtoIso({ x: wall.x2, y: wall.y2, z: 0 }, scale);
      omniCtx.beginPath();
      omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
      omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
      omniCtx.stroke();
    }
    const ep = project3DtoIso(l2Exit, scale);
    drawPortal(cx + ep.screenX, cy + ep.screenY, 'rgba(200, 150, 62, 0.8)');
  }

  // Level 3: Draw 3D Pillars
  if (levelId === 3) {
    omniCtx.strokeStyle = '#8c6d3b';
    omniCtx.lineWidth = 1.5;
    for (const pillar of l3Pillars) {
      const base = project3DtoIso(pillar, scale);
      const top = project3DtoIso({ ...pillar, z: 6 }, scale);
      omniCtx.beginPath();
      omniCtx.moveTo(cx + base.screenX, cy + base.screenY);
      omniCtx.lineTo(cx + top.screenX, cy + top.screenY);
      omniCtx.stroke();
    }
    const ep = project3DtoIso(l3Exit, scale);
    drawPortal(cx + ep.screenX, cy + ep.screenY, 'rgba(212, 175, 55, 0.9)');
  }

  // Level 4 (0D Pointland)
  if (levelId === 4) {
    const origin = project3DtoIso({ x: 0, y: 0, z: 0 }, scale);
    omniCtx.fillStyle = '#c8963e';
    omniCtx.beginPath();
    omniCtx.arc(cx + origin.screenX, cy + origin.screenY, 7, 0, Math.PI * 2);
    omniCtx.fill();
    omniCtx.strokeStyle = '#1a1611';
    omniCtx.stroke();
    return;
  }

  // Draw Player Avatar
  const playerScreen = project3DtoIso(playerPos, scale);
  const px = cx + playerScreen.screenX;
  const py = cy + playerScreen.screenY;

  omniCtx.fillStyle = '#8b1e1e';
  omniCtx.beginPath();
  omniCtx.arc(px, py, 4, 0, Math.PI * 2);
  omniCtx.fill();

  // Sight Heading Indicator
  const fovLen = 2.5;
  const fovTarget = {
    x: playerPos.x + Math.cos(playerAngle) * fovLen,
    y: playerPos.y + Math.sin(playerAngle) * fovLen,
    z: playerPos.z,
  };
  const fovScreen = project3DtoIso(fovTarget, scale);
  omniCtx.strokeStyle = 'rgba(139, 30, 30, 0.8)';
  omniCtx.lineWidth = 1.5;
  omniCtx.beginPath();
  omniCtx.moveTo(px, py);
  omniCtx.lineTo(cx + fovScreen.screenX, cy + fovScreen.screenY);
  omniCtx.stroke();
}

function drawPortal(x: number, y: number, color: string): void {
  omniCtx.save();
  omniCtx.fillStyle = color;
  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 1.5;
  omniCtx.beginPath();
  omniCtx.arc(x, y, 7, 0, Math.PI * 2);
  omniCtx.fill();
  omniCtx.stroke();
  omniCtx.restore();
}

function renderSubjectiveView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  const dim = levelManager.activeDimension;

  // 0D Pointland: Single infinitesimal singularity in infinite darkness
  if (dim === Dimension.D0) {
    subjCtx.fillStyle = '#0d0c0a';
    subjCtx.fillRect(0, 0, w, h);

    const time = Date.now() * 0.003;
    const pulseRadius = 5 + Math.sin(time) * 2;

    // Golden Halo
    const grad = subjCtx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 35);
    grad.addColorStop(0, 'rgba(212, 175, 55, 1)');
    grad.addColorStop(0.3, 'rgba(200, 150, 62, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    subjCtx.fillStyle = grad;
    subjCtx.beginPath();
    subjCtx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
    subjCtx.fill();

    // Central Monad Point
    subjCtx.fillStyle = '#fffdfa';
    subjCtx.beginPath();
    subjCtx.arc(w / 2, h / 2, pulseRadius, 0, Math.PI * 2);
    subjCtx.fill();

    subjCtx.font = 'italic 12px serif';
    subjCtx.fillStyle = '#c8963e';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('“I am One and All!”', w / 2, h / 2 + 50);
    return;
  }

  // 1D Viewport: Optical Slit
  if (dim === Dimension.D1) {
    // Parchment background
    subjCtx.fillStyle = '#f4eedb';
    subjCtx.fillRect(0, 0, w, h);

    const slitY = h / 2;
    const slitHeight = 36;

    // Antique border for slit
    subjCtx.strokeStyle = '#8c6d3b';
    subjCtx.lineWidth = 2;
    subjCtx.strokeRect(40, slitY - slitHeight / 2, w - 80, slitHeight);

    subjCtx.fillStyle = '#1a1611';
    subjCtx.fillRect(42, slitY - slitHeight / 2 + 2, w - 84, slitHeight - 4);

    const sight = compute1DSight(playerPos.x, l1Obstacles, 10);

    // Render Forward Light Point (Right side of center)
    if (sight.forward.isBlocked) {
      const fx = w / 2 + (1 - sight.forward.distance / 10) * (w / 2 - 60);
      const radius = 6 + sight.forward.brightness * 8;
      subjCtx.fillStyle = sight.forward.colorHex;
      subjCtx.globalAlpha = Math.max(0.2, sight.forward.brightness);
      subjCtx.beginPath();
      subjCtx.arc(fx, slitY, radius, 0, Math.PI * 2);
      subjCtx.fill();
      subjCtx.globalAlpha = 1.0;
    }

    // Render Backward Light Point (Left side of center)
    if (sight.backward.isBlocked) {
      const bx = w / 2 - (1 - sight.backward.distance / 10) * (w / 2 - 60);
      const radius = 6 + sight.backward.brightness * 8;
      subjCtx.fillStyle = sight.backward.colorHex;
      subjCtx.globalAlpha = Math.max(0.2, sight.backward.brightness);
      subjCtx.beginPath();
      subjCtx.arc(bx, slitY, radius, 0, Math.PI * 2);
      subjCtx.fill();
      subjCtx.globalAlpha = 1.0;
    }

    subjCtx.font = '11px serif';
    subjCtx.fillStyle = '#8c6d3b';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('◀ 后方视界 (Backward)     |     前方视界 (Forward) ▶', w / 2, slitY + 40);
    return;
  }

  // 2D Viewport: Flatland Fog-Edge Horizon Scan
  if (dim === Dimension.D2) {
    subjCtx.fillStyle = '#e8dfc8'; // Foggy parchment horizon
    subjCtx.fillRect(0, 0, w, h);

    const rayCount = 120;
    const rays = cast2DHorizonRays(
      { x: playerPos.x, y: playerPos.y, angle: playerAngle },
      l2Walls,
      60,
      rayCount
    );

    const colWidth = w / rayCount;
    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i];
      if (ray.distance < Infinity) {
        // Perspective column height with fog fading
        const colHeight = Math.min(h, (h / (ray.distance * Math.cos(ray.angleOffset))) * 3.5);
        const top = (h - colHeight) / 2;

        // Dark engraving stroke fading into fog
        const alpha = Math.max(0.1, ray.brightness);
        subjCtx.fillStyle = `rgba(26, 22, 17, ${alpha})`;
        subjCtx.fillRect(i * colWidth, top, colWidth + 0.5, colHeight);
      }
    }

    // Engraving horizon guideline
    subjCtx.strokeStyle = 'rgba(140, 109, 59, 0.4)';
    subjCtx.lineWidth = 1;
    subjCtx.beginPath();
    subjCtx.moveTo(0, h / 2);
    subjCtx.lineTo(w, h / 2);
    subjCtx.stroke();

    subjCtx.font = '11px serif';
    subjCtx.fillStyle = '#1a1611';
    subjCtx.textAlign = 'left';
    subjCtx.fillText('雾中辨角法：越近线条越黑越宽，越远渐隐于雾中', 14, 20);
    return;
  }

  // 3D Viewport: Wireframe perspective
  if (dim === Dimension.D3) {
    subjCtx.fillStyle = '#f4eedb';
    subjCtx.fillRect(0, 0, w, h);

    subjCtx.strokeStyle = '#1a1611';
    subjCtx.lineWidth = 1.5;

    // Horizon line
    subjCtx.beginPath();
    subjCtx.moveTo(0, h / 2);
    subjCtx.lineTo(w, h / 2);
    subjCtx.stroke();

    subjCtx.font = '12px serif';
    subjCtx.fillStyle = '#8b1e1e';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('三维全自由视界：已脱离平面束缚，凌空俯瞰万物', w / 2, 30);
  }
}

function gameLoop(): void {
  updateMovement();
  renderOmniscientView();
  renderSubjectiveView();
  requestAnimationFrame(gameLoop);
}

// Boot
updateUI();
requestAnimationFrame(gameLoop);
