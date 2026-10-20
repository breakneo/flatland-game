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
const btnAscendText = document.getElementById('btn-ascend-text')!;
const btnAscendSub = document.getElementById('btn-ascend-sub')!;
const modalOverlay = document.getElementById('modal-overlay')!;
const modalTitle = document.getElementById('modal-title')!;
const modalBody = document.getElementById('modal-body')!;
const btnModalAction = document.getElementById('btn-modal-action') as HTMLButtonElement;
const btnQuickReset = document.getElementById('btn-quick-reset')!;
const subjViewport = document.getElementById('subj-viewport')!;

const btnUp = document.getElementById('btn-up')!;
const btnDown = document.getElementById('btn-down')!;
const btnLeft = document.getElementById('btn-left')!;
const btnRight = document.getElementById('btn-right')!;

const game = new EscapeGameController();

// 3 枚神谕残片合理布局：
// 1. 出生正前方安全引导碎片 (-3.0, 0)
// 2. 中庭走廊巡逻空隙碎片 (1.0, -0.5)
// 3. 破墙前神圣顿悟碎片 (3.8, 0.0)
interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}
const fragments: Fragment[] = [
  { x: -3.0, y: 0, collected: false },
  { x: 1.0, y: -0.5, collected: false },
  { x: 3.8, y: 0.0, collected: false },
];

let hasTriggeredSphereEpiphany = false;

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
    dialogueStrip.textContent = '“【神圣真言爆发】正方体之躯破开二维羁绊，拔地而起，俯瞰凡俗！”';
  } else {
    dialogueStrip.textContent = '“心智尚未充盈！需探寻集齐 3 枚神谕残卷方能参悟第三维度！”';
  }
}

btnAscend.addEventListener('click', handleAscend);

function resetWholeLevel(): void {
  modalOverlay.classList.remove('active');
  game.reset();
  hasTriggeredSphereEpiphany = false;
  for (const f of fragments) f.collected = false;
  dialogueStrip.textContent = '“【正方形绅士】四面石墙将你锁在平面。请沿走廊前行，拾取前方神谕碎片！”';
}

btnQuickReset.addEventListener('click', resetWholeLevel);
btnModalAction.addEventListener('click', resetWholeLevel);

// 初始欢迎语
dialogueStrip.textContent = '“【正方形绅士】四面石墙将你锁在平面。请沿走廊前行，拾取前方神谕碎片！”';

// 主循环
let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // 1. 处理输入
  let forward = 0;
  let turn = 0;
  if (keys['w'] || keys['arrowup']) forward += 1;
  if (keys['s'] || keys['arrowdown']) forward -= 1;
  if (keys['a'] || keys['arrowleft']) turn -= 1;
  if (keys['d'] || keys['arrowright']) turn += 1;

  game.movePlayer(forward, turn, dt);

  // 2. 碎片收集与球体导师启示
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!f.collected) {
      const d = Math.hypot(game.player.x - f.x, game.player.y - f.y);
      if (d < 1.3) {
        f.collected = true;
        game.addEnergy(35);
        if (i === 0) {
          dialogueStrip.textContent = '“【神谕初显】四等边平直均等之躯，何必拘泥于平面之锁？”';
        } else if (i === 1) {
          dialogueStrip.textContent = '“【真理渐明】等腰暴徒唯知盲目前冲，不知天地尚有上下！”';
        } else {
          // 第 3 枚碎片：球体先知震撼显圣神谕
          hasTriggeredSphereEpiphany = true;
          dialogueStrip.textContent = '【球体导师之神谕】“愚钝的正方形！既非向南，亦非向北——向上！向第三维度飞升！”';
        }
      }
    }
  }

  // 3. 状态步进
  const { isNearMiss } = game.update(dt);
  if (isNearMiss && !hasTriggeredSphereEpiphany) {
    dialogueStrip.textContent = '“【锐角警报！】等腰士兵的致命尖角在雾中擦身而过！”';
  }

  // 4. 更新水银刻度与升维真言按钮状态
  mercuryBar.style.width = `${game.energy}%`;
  if (game.energy >= 100) {
    btnAscend.classList.remove('btn-sealed');
    btnAscend.classList.add('charged');
    btnAscendText.textContent = '向上，而不是向北';
    btnAscendSub.textContent = '(神谕觉醒 · 腾空飞升)';
  } else {
    btnAscend.classList.add('btn-sealed');
    btnAscend.classList.remove('charged');
    btnAscendText.textContent = '心智冥思中';
    btnAscendSub.textContent = `(集神谕: ${Math.round(game.energy)}%)`;
  }

  // 5. 通关/败局弹窗处理
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

  // 6. 仅对下屏第一人称容器做微量局部震动
  const juiceFrame = game.juice.update(dt);
  subjViewport.style.transform = `translate(${juiceFrame.offsetX}px, ${juiceFrame.offsetY}px)`;

  // 7. 渲染双视窗
  renderOmniscientView();
  renderSubjectiveFogView();

  requestAnimationFrame(gameLoop);
}

// =========================================================================
// 上屏：3D 全知神谕沙盘（浑天仪星轨、立体石壁、自下而上进深、天界脱逃门）
// =========================================================================
function renderOmniscientView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 10;
  const scale = 14;

  // 羊皮纸沙盘底衬
  omniCtx.fillStyle = '#f8f4e8';
  omniCtx.fillRect(0, 0, w, h);

  // 浑天仪同心星轨罗盘底纹
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.16)';
  omniCtx.lineWidth = 1;
  const radii = [3.5, 6.0, 8.5];
  for (const r of radii) {
    omniCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 18) {
      const pt = project3DtoIso({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 }, scale);
      if (a === 0) omniCtx.moveTo(cx + pt.screenX, cy + pt.screenY);
      else omniCtx.lineTo(cx + pt.screenX, cy + pt.screenY);
    }
    omniCtx.stroke();
  }

  // 地面坐标经纬细线
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.12)';
  for (let x = -7; x <= 7; x += 2.5) {
    const p1 = project3DtoIso({ x, y: -7, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 7, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -7; y <= 7; y += 2.5) {
    const p1 = project3DtoIso({ x: -7, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 7, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // 绘制 3D 棱台厚重石墙与东墙缺口
  const wallHeight = 1.6;
  const wallsToRender = [
    // 西墙
    { x1: -7, y1: -7, x2: -7, y2: 7 },
    // 南墙
    { x1: -7, y1: -7, x2: 7, y2: -7 },
    // 北墙
    { x1: -7, y1: 7, x2: 7, y2: 7 },
    // 东墙南段
    { x1: 7, y1: -7, x2: 7, y2: -1.6 },
    // 东墙北段
    { x1: 7, y1: 1.6, x2: 7, y2: 7 },
  ];

  for (const wSeg of wallsToRender) {
    const b1 = project3DtoIso({ x: wSeg.x1, y: wSeg.y1, z: 0 }, scale);
    const b2 = project3DtoIso({ x: wSeg.x2, y: wSeg.y2, z: 0 }, scale);
    const t1 = project3DtoIso({ x: wSeg.x1, y: wSeg.y1, z: wallHeight }, scale);
    const t2 = project3DtoIso({ x: wSeg.x2, y: wSeg.y2, z: wallHeight }, scale);

    // 墙体立面阴影
    omniCtx.fillStyle = 'rgba(38, 32, 24, 0.85)';
    omniCtx.beginPath();
    omniCtx.moveTo(cx + b1.screenX, cy + b1.screenY);
    omniCtx.lineTo(cx + b2.screenX, cy + b2.screenY);
    omniCtx.lineTo(cx + t2.screenX, cy + t2.screenY);
    omniCtx.lineTo(cx + t1.screenX, cy + t1.screenY);
    omniCtx.closePath();
    omniCtx.fill();

    // 墙顶描金边线
    omniCtx.strokeStyle = '#c8963e';
    omniCtx.lineWidth = 1.5;
    omniCtx.beginPath();
    omniCtx.moveTo(cx + t1.screenX, cy + t1.screenY);
    omniCtx.lineTo(cx + t2.screenX, cy + t2.screenY);
    omniCtx.stroke();
  }

  // -------------------------------------------------------------
  // 神圣醒目的高维脱逃之门 (建议 3 重点强化)
  // -------------------------------------------------------------
  const time = Date.now() / 1000;
  const exitPos = game.exit;
  const epBase = project3DtoIso({ x: exitPos.x, y: exitPos.y, z: 0 }, scale);
  const epTop = project3DtoIso({ x: exitPos.x, y: exitPos.y, z: 4.5 }, scale);

  // 冲天神圣三维光柱
  const gradPillar = omniCtx.createLinearGradient(
    cx + epBase.screenX, cy + epBase.screenY,
    cx + epTop.screenX, cy + epTop.screenY
  );
  gradPillar.addColorStop(0, 'rgba(212, 175, 55, 0.7)');
  gradPillar.addColorStop(1, 'rgba(255, 245, 180, 0.05)');
  omniCtx.fillStyle = gradPillar;
  omniCtx.beginPath();
  omniCtx.moveTo(cx + epBase.screenX - 10, cy + epBase.screenY);
  omniCtx.lineTo(cx + epBase.screenX + 10, cy + epBase.screenY);
  omniCtx.lineTo(cx + epTop.screenX + 3, cy + epTop.screenY);
  omniCtx.lineTo(cx + epTop.screenX - 3, cy + epTop.screenY);
  omniCtx.closePath();
  omniCtx.fill();

  // 3 层动态自转光环
  for (let rIdx = 0; rIdx < 3; rIdx++) {
    const ringRadius = 1.2 + rIdx * 0.5;
    const ringSpeed = time * (1.2 + rIdx * 0.4);
    omniCtx.strokeStyle = rIdx === 0 ? '#ffea88' : '#d4af37';
    omniCtx.lineWidth = 1.8;
    omniCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 10) {
      const rx = exitPos.x + Math.cos(a + ringSpeed) * ringRadius;
      const ry = exitPos.y + Math.sin(a + ringSpeed) * ringRadius;
      const rz = 0.2 + rIdx * 0.4;
      const pt = project3DtoIso({ x: rx, y: ry, z: rz }, scale);
      if (a === 0) omniCtx.moveTo(cx + pt.screenX, cy + pt.screenY);
      else omniCtx.lineTo(cx + pt.screenX, cy + pt.screenY);
    }
    omniCtx.stroke();
  }

  // 悬浮门神谕文字
  omniCtx.font = 'bold 11px serif';
  omniCtx.fillStyle = '#b38022';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【天界脱逃之门】', cx + epBase.screenX, cy + epBase.screenY - 26);

  // -------------------------------------------------------------
  // 3 枚自转悬浮神谕八面水晶
  // -------------------------------------------------------------
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!f.collected) {
      const floatZ = 0.3 + Math.sin(time * 3 + i) * 0.15;
      const p = project3DtoIso({ x: f.x, y: f.y, z: floatZ }, scale);
      const fx = cx + p.screenX;
      const fy = cy + p.screenY;

      // 金粉光晕
      omniCtx.fillStyle = 'rgba(212, 175, 55, 0.25)';
      omniCtx.beginPath();
      omniCtx.arc(fx, fy, 11, 0, Math.PI * 2);
      omniCtx.fill();

      // 八面水晶
      omniCtx.fillStyle = '#ffea88';
      omniCtx.strokeStyle = '#8c6d3b';
      omniCtx.lineWidth = 1.5;
      omniCtx.beginPath();
      omniCtx.moveTo(fx, fy - 7);
      omniCtx.lineTo(fx + 6, fy);
      omniCtx.lineTo(fx, fy + 7);
      omniCtx.lineTo(fx - 6, fy);
      omniCtx.closePath();
      omniCtx.fill();
      omniCtx.stroke();

      omniCtx.font = 'bold 9px serif';
      omniCtx.fillStyle = '#1a1611';
      omniCtx.textAlign = 'center';
      omniCtx.fillText(`${i + 1}`, fx, fy + 3);
    }
  }

  // -------------------------------------------------------------
  // 等腰士兵：狭长如长矛毒刺（长 2.4，底宽 0.38，顶角小于10度）
  // -------------------------------------------------------------
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

    // 锋利长矛身躯
    omniCtx.fillStyle = '#7a1818';
    omniCtx.strokeStyle = '#3d0a0a';
    omniCtx.lineWidth = 1.2;
    omniCtx.beginPath();
    omniCtx.moveTo(ax, ay);
    omniCtx.lineTo(blx, bly);
    omniCtx.lineTo(brx, bry);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // 刺目红芒尖端
    omniCtx.fillStyle = '#ff2020';
    omniCtx.beginPath();
    omniCtx.arc(ax, ay, 2.2, 0, Math.PI * 2);
    omniCtx.fill();
  }

  // -------------------------------------------------------------
  // 正方形绅士（四等边·四直角，端正学者身材 size 1.2）
  // -------------------------------------------------------------
  const squareVerts2D = getSquareVertices(
    { x: game.player.x, y: game.player.y },
    game.player.size,
    game.player.angle
  );

  const groundPoints = squareVerts2D.map((pt) => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  const airPoints = squareVerts2D.map((pt) => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: game.currentZ }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  if (game.currentZ > 0) {
    // 地面正方形阴影
    omniCtx.fillStyle = 'rgba(26, 22, 17, 0.28)';
    omniCtx.beginPath();
    omniCtx.moveTo(groundPoints[0].x, groundPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(groundPoints[i].x, groundPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    // 4 条升维垂直正方柱棱光
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    omniCtx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      omniCtx.beginPath();
      omniCtx.moveTo(groundPoints[i].x, groundPoints[i].y);
      omniCtx.lineTo(airPoints[i].x, airPoints[i].y);
      omniCtx.stroke();
    }

    // 空中发光正方体顶面
    omniCtx.fillStyle = 'rgba(244, 219, 133, 0.9)';
    omniCtx.strokeStyle = '#d4af37';
    omniCtx.lineWidth = 2.2;
    omniCtx.beginPath();
    omniCtx.moveTo(airPoints[0].x, airPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(airPoints[i].x, airPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();
  } else {
    // 平面二维正方形绅士
    omniCtx.fillStyle = '#1c2733';
    omniCtx.strokeStyle = '#c8963e';
    omniCtx.lineWidth = 2.2;
    omniCtx.beginPath();
    omniCtx.moveTo(groundPoints[0].x, groundPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(groundPoints[i].x, groundPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // 内嵌同心方纹与学者标签
    const centerPoint = project3DtoIso({ x: game.player.x, y: game.player.y, z: 0 }, scale);
    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#1a2634';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('正方形绅士', cx + centerPoint.screenX, cy + centerPoint.screenY - 14);
  }

  // -------------------------------------------------------------
  // 柔和探照视锥（消除突兀竖杆）
  // -------------------------------------------------------------
  const centerP = project3DtoIso({ x: game.player.x, y: game.player.y, z: game.currentZ }, scale);
  const px = cx + centerP.screenX;
  const py = cy + centerP.screenY;

  const fovRad = Math.PI / 4;
  const coneDist = 2.4;
  const coneLeft = project3DtoIso({
    x: game.player.x + Math.cos(game.player.angle - fovRad / 2) * coneDist,
    y: game.player.y + Math.sin(game.player.angle - fovRad / 2) * coneDist,
    z: game.currentZ,
  }, scale);
  const coneRight = project3DtoIso({
    x: game.player.x + Math.cos(game.player.angle + fovRad / 2) * coneDist,
    y: game.player.y + Math.sin(game.player.angle + fovRad / 2) * coneDist,
    z: game.currentZ,
  }, scale);
  const coneApex = project3DtoIso({
    x: game.player.x + Math.cos(game.player.angle) * (coneDist + 0.3),
    y: game.player.y + Math.sin(game.player.angle) * (coneDist + 0.3),
    z: game.currentZ,
  }, scale);

  omniCtx.fillStyle = 'rgba(212, 175, 55, 0.12)';
  omniCtx.beginPath();
  omniCtx.moveTo(px, py);
  omniCtx.lineTo(cx + coneLeft.screenX, cy + coneLeft.screenY);
  omniCtx.lineTo(cx + coneApex.screenX, cy + coneApex.screenY);
  omniCtx.lineTo(cx + coneRight.screenX, cy + coneRight.screenY);
  omniCtx.closePath();
  omniCtx.fill();

  const tipX = cx + coneApex.screenX;
  const tipY = cy + coneApex.screenY;
  omniCtx.fillStyle = '#d4af37';
  omniCtx.beginPath();
  omniCtx.moveTo(tipX, tipY - 4);
  omniCtx.lineTo(tipX + 3, tipY);
  omniCtx.lineTo(tipX, tipY + 4);
  omniCtx.lineTo(tipX - 3, tipY);
  omniCtx.closePath();
  omniCtx.fill();

  // -------------------------------------------------------------
  // 球体导师神圣降临投影 (建议 5 显圣)
  // -------------------------------------------------------------
  if (game.energy >= 100) {
    const sphereY = 32;
    const sphereX = w / 2;
    const gradSphere = omniCtx.createRadialGradient(
      sphereX - 4, sphereY - 4, 3,
      sphereX, sphereY, 22
    );
    gradSphere.addColorStop(0, '#ffffff');
    gradSphere.addColorStop(0.3, '#ffea88');
    gradSphere.addColorStop(0.8, '#b38022');
    gradSphere.addColorStop(1, 'rgba(140, 109, 59, 0)');

    omniCtx.fillStyle = gradSphere;
    omniCtx.beginPath();
    omniCtx.arc(sphereX, sphereY, 24, 0, Math.PI * 2);
    omniCtx.fill();

    omniCtx.font = 'bold 9px serif';
    omniCtx.fillStyle = '#8c6d3b';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('【天界球体导师·显圣投影】', sphereX, sphereY + 26);
  }
}

// =========================================================================
// 下屏：第一人称迷雾视界（连续平滑光带、等腰尖端柔和漫射光斑、天界晨曦）
// =========================================================================
function renderSubjectiveFogView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  // 维多利亚深色羊皮纸视界背景
  subjCtx.fillStyle = '#ded4be';
  subjCtx.fillRect(0, 0, w, h);

  const hudHeight = 36;
  const horizonY = (h - hudHeight) / 2;

  // 中央微薄视界槽底带
  subjCtx.fillStyle = '#cfc3a9';
  subjCtx.fillRect(0, horizonY - 26, w, 52);

  // 天界东方脱逃晨曦圣光 (当面朝东向出口时浮现)
  const angleNormalized = (((game.player.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const facingEastFactor = Math.max(0, Math.cos(angleNormalized)); // 朝向 0° 时为 1
  if (facingEastFactor > 0.4) {
    const dawnAlpha = (facingEastFactor - 0.4) * 0.45;
    const dawnGrad = subjCtx.createRadialGradient(
      w / 2, horizonY, 2,
      w / 2, horizonY, 80
    );
    dawnGrad.addColorStop(0, `rgba(255, 235, 150, ${dawnAlpha * 1.5})`);
    dawnGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    subjCtx.fillStyle = dawnGrad;
    subjCtx.beginPath();
    subjCtx.arc(w / 2, horizonY, 80, 0, Math.PI * 2);
    subjCtx.fill();
  }

  const rawRays = game.getFogRays(96);
  const rayCount = rawRays.length;
  const colWidth = w / rayCount;

  // 3 点相邻滑动平滑插值 (消除突兀硬切阶梯)
  const smoothHeights: number[] = new Array(rayCount);
  const smoothAlphas: number[] = new Array(rayCount);
  const isApexHighlights: boolean[] = new Array(rayCount);

  let maxApexProximity = 0;
  let hasNearIsosceles = false;
  let peakApexRayIndex = -1;

  for (let i = 0; i < rayCount; i++) {
    const ray = rawRays[i];
    if (ray.hitType === 'isosceles') {
      hasNearIsosceles = true;
      const apexP = ray.apexProximity || 0;
      if (apexP > maxApexProximity) {
        maxApexProximity = apexP;
        peakApexRayIndex = i;
      }
    }
  }

  for (let i = 0; i < rayCount; i++) {
    const prev = rawRays[Math.max(0, i - 1)];
    const curr = rawRays[i];
    const next = rawRays[Math.min(rayCount - 1, i + 1)];

    const avgDist = (prev.distance + curr.distance * 2 + next.distance) / 4;
    const avgBright = (prev.brightness + curr.brightness * 2 + next.brightness) / 4;
    const avgApex = ((prev.apexProximity || 0) + (curr.apexProximity || 0) * 2 + (next.apexProximity || 0)) / 4;

    const distFactor = Math.min(1, 1 / (avgDist * Math.cos(curr.angleOffset)));
    let beamHeight = Math.max(4, Math.min(20, 4 + distFactor * 14));

    if (curr.hitType === 'isosceles') {
      if (avgApex > 0.4) {
        beamHeight = Math.min(24, beamHeight + avgApex * 5);
        isApexHighlights[i] = true;
      } else {
        beamHeight = Math.max(3, beamHeight * 0.7);
        isApexHighlights[i] = false;
      }
    } else {
      isApexHighlights[i] = false;
    }

    smoothHeights[i] = beamHeight;
    smoothAlphas[i] = Math.max(0.12, Math.min(1, avgBright * 0.9));
  }

  // 绘制平滑连续光带多边形 (建议 4 消除突兀)
  for (let i = 0; i < rayCount - 1; i++) {
    const x1 = i * colWidth;
    const x2 = (i + 1) * colWidth;
    const h1 = smoothHeights[i];
    const h2 = smoothHeights[i + 1];
    const top1 = horizonY - h1 / 2;
    const btm1 = horizonY + h1 / 2;
    const top2 = horizonY - h2 / 2;
    const btm2 = horizonY + h2 / 2;

    const currRay = rawRays[i];
    if (currRay.distance < Infinity) {
      if (currRay.hitType === 'isosceles') {
        if (isApexHighlights[i]) {
          // 顶角刺目红芒
          subjCtx.fillStyle = `rgba(255, 45, 45, ${smoothAlphas[i] * 1.3})`;
        } else {
          // 两翼暗红深雾
          subjCtx.fillStyle = `rgba(130, 25, 25, ${smoothAlphas[i] * 0.6})`;
        }
      } else {
        // 石墙
        subjCtx.fillStyle = `rgba(26, 22, 17, ${smoothAlphas[i]})`;
      }

      subjCtx.beginPath();
      subjCtx.moveTo(x1, top1);
      subjCtx.lineTo(x2, top2);
      subjCtx.lineTo(x2, btm2);
      subjCtx.lineTo(x1, btm1);
      subjCtx.closePath();
      subjCtx.fill();
    }
  }

  // 等腰顶角柔和径向辉光 (Soft Radial Apex Bloom)
  if (peakApexRayIndex >= 0 && maxApexProximity > 0.4) {
    const apexCenterX = peakApexRayIndex * colWidth;
    const glowGrad = subjCtx.createRadialGradient(
      apexCenterX, horizonY, 1,
      apexCenterX, horizonY, 26
    );
    glowGrad.addColorStop(0, 'rgba(255, 240, 240, 0.95)');
    glowGrad.addColorStop(0.35, 'rgba(255, 40, 40, 0.7)');
    glowGrad.addColorStop(1, 'rgba(180, 20, 20, 0)');

    subjCtx.fillStyle = glowGrad;
    subjCtx.beginPath();
    subjCtx.arc(apexCenterX, horizonY, 26, 0, Math.PI * 2);
    subjCtx.fill();
  }

  // 视界槽基准细线
  subjCtx.strokeStyle = 'rgba(140, 109, 59, 0.3)';
  subjCtx.lineWidth = 1;
  subjCtx.beginPath();
  subjCtx.moveTo(0, horizonY);
  subjCtx.lineTo(w, horizonY);
  subjCtx.stroke();

  // 视界槽青铜上下边条
  subjCtx.strokeStyle = '#8c6d3b';
  subjCtx.lineWidth = 1;
  subjCtx.beginPath();
  subjCtx.moveTo(0, horizonY - 26);
  subjCtx.lineTo(w, horizonY - 26);
  subjCtx.moveTo(0, horizonY + 26);
  subjCtx.lineTo(w, horizonY + 26);
  subjCtx.stroke();

  // 视界上方实时手稿提示
  subjCtx.font = '10px serif';
  subjCtx.textAlign = 'center';
  if (hasNearIsosceles && maxApexProximity > 0.5) {
    subjCtx.fillStyle = '#8b1e1e';
    subjCtx.fillText('【雾中辨角】“尖角分外刺目明亮，两翼急剧暗淡隐雾——等腰士兵！”', w / 2, horizonY - 30);
  } else if (hasNearIsosceles) {
    subjCtx.fillStyle = '#6e451e';
    subjCtx.fillText('【雾中辨角】“远处微红暗影浮动，锐角未明……”', w / 2, horizonY - 30);
  } else if (facingEastFactor > 0.7) {
    subjCtx.fillStyle = '#b38022';
    subjCtx.fillText('【神域感召】“东方尽头微光拂动，乃天界脱逃之门。”', w / 2, horizonY - 30);
  } else {
    subjCtx.fillStyle = '#5c4e3a';
    subjCtx.fillText('【雾中辨形】“平直暗影，明暗均等——石牢坚壁。”', w / 2, horizonY - 30);
  }

  // -------------------------------------------------------------
  // 正方形绅士第一人称前沿 HUD (90° 直角与方位仪)
  // -------------------------------------------------------------
  const hudY = h - hudHeight;

  subjCtx.fillStyle = '#1c2733';
  subjCtx.fillRect(0, hudY, w, hudHeight);

  subjCtx.strokeStyle = '#c8963e';
  subjCtx.lineWidth = 2.5;
  subjCtx.beginPath();
  subjCtx.moveTo(0, hudY);
  subjCtx.lineTo(w, hudY);
  subjCtx.stroke();

  // 左右直角 90° 标记
  subjCtx.strokeStyle = '#d4af37';
  subjCtx.lineWidth = 2;
  subjCtx.strokeRect(10, hudY + 7, 13, 13);
  subjCtx.font = 'bold 9px serif';
  subjCtx.fillStyle = '#f4eedb';
  subjCtx.textAlign = 'left';
  subjCtx.fillText('左直角 90°', 28, hudY + 18);

  subjCtx.strokeRect(w - 23, hudY + 7, 13, 13);
  subjCtx.textAlign = 'right';
  subjCtx.fillText('右直角 90°', w - 28, hudY + 18);

  const deg = Math.round((((game.player.angle * 180) / Math.PI) % 360 + 360) % 360);
  subjCtx.font = 'bold 11px serif';
  subjCtx.fillStyle = '#d4af37';
  subjCtx.textAlign = 'center';
  subjCtx.fillText(`【正方形平直前沿视界 · 方位 ${deg}°】`, w / 2, hudY + 22);

  // 升维滞空横幅
  if (game.isAscended) {
    subjCtx.fillStyle = 'rgba(212, 175, 55, 0.95)';
    subjCtx.fillRect(w / 2 - 130, 6, 260, 24);
    subjCtx.strokeStyle = '#8c6d3b';
    subjCtx.strokeRect(w / 2 - 130, 6, 260, 24);

    subjCtx.font = 'bold 11px serif';
    subjCtx.fillStyle = '#1a1611';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('【高维跃迁滞空中 · 越过二维屏障】', w / 2, 22);
  }
}

// 启动游戏主循环
requestAnimationFrame(gameLoop);
