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

// 3 枚神谕残片（统一为优雅端庄的神谕金菱星印）：
// 1. 安全引导点 (-2.5, 0)
// 2. 中庭巡逻空隙 (0.8, -0.6)
// 3. 东面石壁前 (3.2, 0.0)
interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}
const fragments: Fragment[] = [
  { x: -2.5, y: 0, collected: false },
  { x: 0.8, y: -0.6, collected: false },
  { x: 3.2, y: 0.0, collected: false },
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

// 天界球体导师神谕圣音播放 (TTS 语音 + 大教堂天籁和弦)
function playSphereOracleAudio(): void {
  try {
    const audio = new Audio('/audio/oracle.wav');
    audio.volume = 0.95;
    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('愚钝的正方形！既不可向南，亦不可向北！向上，向第三维度飞升！');
        u.lang = 'zh-CN';
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    });
  } catch (_) {}

  playHeavenlyOrganChord();
}

function playHeavenlyOrganChord(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs = [130.81, 196.00, 261.63, 329.63, 392.00]; // C大调天界和弦
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.6);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.2);
    masterGain.connect(ctx.destination);

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 4.2);
    }
  } catch (_) {}
}

function handleAscend(): void {
  const success = game.requestAscension();
  if (success) {
    dialogueStrip.textContent = '“【真言爆发】正方形拔地而起，俯瞰凡俗四壁！”';
  } else {
    dialogueStrip.textContent = '“心智尚未充盈！需探寻集齐 3 枚神谕残片方可升维！”';
  }
}

btnAscend.addEventListener('click', handleAscend);

function resetWholeLevel(): void {
  modalOverlay.classList.remove('active');
  game.reset();
  hasTriggeredSphereEpiphany = false;
  for (const f of fragments) f.collected = false;
  dialogueStrip.textContent = '“【正方形绅士】四面封闭石墙将你闭锁。请前行拾取神谕金印！”';
}

btnQuickReset.addEventListener('click', resetWholeLevel);
btnModalAction.addEventListener('click', resetWholeLevel);

dialogueStrip.textContent = '“【正方形绅士】四面封闭石墙将你闭锁。请前行拾取神谕金印！”';

// 主循环
let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  let forward = 0;
  let turn = 0;
  if (keys['w'] || keys['arrowup']) forward += 1;
  if (keys['s'] || keys['arrowdown']) forward -= 1;
  if (keys['a'] || keys['arrowleft']) turn -= 1;
  if (keys['d'] || keys['arrowright']) turn += 1;

  game.movePlayer(forward, turn, dt);

  // 碎片收集与球体导师圣音降临
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!f.collected) {
      const d = Math.hypot(game.player.x - f.x, game.player.y - f.y);
      if (d < 1.3) {
        f.collected = true;
        game.addEnergy(35);
        if (i === 0) {
          dialogueStrip.textContent = '“【神谕初启】四等边平直均等之身，何必拘泥于平面之锁？”';
        } else if (i === 1) {
          dialogueStrip.textContent = '“【真理渐明】等腰暴徒唯知盲目前冲，不知天地尚有上下！”';
        } else {
          // 第 3 枚碎片：球体导师圣音响彻
          hasTriggeredSphereEpiphany = true;
          dialogueStrip.textContent = '【球体导师之神谕】“愚钝的正方形！既不可向南，亦不可向北！向上，向第三维度飞升！”';
          playSphereOracleAudio();
        }
      }
    }
  }

  const { isNearMiss } = game.update(dt);
  if (isNearMiss && !hasTriggeredSphereEpiphany) {
    dialogueStrip.textContent = '“【锐角警报！】等腰士兵的致命尖角在雾中逼近！”';
  }

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

  // 仅对第一人称视界施加微量局部震颤
  const juiceFrame = game.juice.update(dt);
  subjViewport.style.transform = `translate(${juiceFrame.offsetX}px, ${juiceFrame.offsetY}px)`;

  renderOmniscientView();
  renderSubjectiveFogView();

  requestAnimationFrame(gameLoop);
}

// =========================================================================
// 上屏：沙盘视角（饱满大气比例 scale 15.2、平整二维石墙无多余高度、出口清晰独立）
// =========================================================================
function renderOmniscientView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 15;
  const scale = 15.2; // 放大比例，告别小人国！

  // 古典羊皮纸底色
  omniCtx.fillStyle = '#f8f4e8';
  omniCtx.fillRect(0, 0, w, h);

  // 雅致同心星轨罗盘底纹
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.15)';
  omniCtx.lineWidth = 1;
  const radii = [3.2, 5.2];
  for (const r of radii) {
    omniCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 16) {
      const pt = project3DtoIso({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0 }, scale);
      if (a === 0) omniCtx.moveTo(cx + pt.screenX, cy + pt.screenY);
      else omniCtx.lineTo(cx + pt.screenX, cy + pt.screenY);
    }
    omniCtx.stroke();
  }

  // 地面坐标经纬细线
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.1)';
  for (let x = -5.8; x <= 5.8; x += 2.0) {
    const p1 = project3DtoIso({ x, y: -5.8, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 5.8, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -5.8; y <= 5.8; y += 2.0) {
    const p1 = project3DtoIso({ x: -5.8, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 5.8, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // -------------------------------------------------------------
  // 绘制平面国本真平整封闭石墙（无多余 3D 巨石高度立面，纯粹严密闭合）
  // -------------------------------------------------------------
  const wallCorners = [
    { x: -5.8, y: -5.8 },
    { x: -5.8, y: 5.8 },
    { x: 5.8, y: 5.8 },
    { x: 5.8, y: -5.8 },
  ];

  const screenCorners = wallCorners.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  // 石墙主体线框（深墨色 3px，纯正二维平面国封闭石室）
  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 3.2;
  omniCtx.beginPath();
  omniCtx.moveTo(screenCorners[0].x, screenCorners[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(screenCorners[i].x, screenCorners[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  // 墙体内沿古典描金线（维多利亚刻印铜线）
  omniCtx.strokeStyle = 'rgba(200, 150, 62, 0.6)';
  omniCtx.lineWidth = 1.2;
  omniCtx.stroke();

  // -------------------------------------------------------------
  // 东墙外侧：独立开阔的【出口】（与围墙完全错开，无任何重叠）
  // -------------------------------------------------------------
  const time = Date.now() / 1000;
  const exitPos = game.exit; // x: 9.6, y: 0
  const epBase = project3DtoIso({ x: exitPos.x, y: exitPos.y, z: 0 }, scale);
  const epTop = project3DtoIso({ x: exitPos.x, y: exitPos.y, z: 3.0 }, scale);

  // 清晰微光光柱
  const gradPillar = omniCtx.createLinearGradient(
    cx + epBase.screenX, cy + epBase.screenY,
    cx + epTop.screenX, cy + epTop.screenY
  );
  gradPillar.addColorStop(0, 'rgba(212, 175, 55, 0.65)');
  gradPillar.addColorStop(1, 'rgba(255, 245, 180, 0.05)');
  omniCtx.fillStyle = gradPillar;
  omniCtx.beginPath();
  omniCtx.moveTo(cx + epBase.screenX - 10, cy + epBase.screenY);
  omniCtx.lineTo(cx + epBase.screenX + 10, cy + epBase.screenY);
  omniCtx.lineTo(cx + epTop.screenX + 3, cy + epTop.screenY);
  omniCtx.lineTo(cx + epTop.screenX - 3, cy + epTop.screenY);
  omniCtx.closePath();
  omniCtx.fill();

  // 双层旋转金色光环
  for (let rIdx = 0; rIdx < 2; rIdx++) {
    const ringRadius = 1.0 + rIdx * 0.4;
    const ringSpeed = time * (1.2 + rIdx * 0.4);
    omniCtx.strokeStyle = rIdx === 0 ? '#ffea88' : '#d4af37';
    omniCtx.lineWidth = 1.8;
    omniCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += Math.PI / 8) {
      const rx = exitPos.x + Math.cos(a + ringSpeed) * ringRadius;
      const ry = exitPos.y + Math.sin(a + ringSpeed) * ringRadius;
      const pt = project3DtoIso({ x: rx, y: ry, z: 0.2 + rIdx * 0.3 }, scale);
      if (a === 0) omniCtx.moveTo(cx + pt.screenX, cy + pt.screenY);
      else omniCtx.lineTo(cx + pt.screenX, cy + pt.screenY);
    }
    omniCtx.stroke();
  }

  // 清爽典雅标签【出口】（绝无中二词，位置独立开阔）
  omniCtx.font = 'bold 11px serif';
  omniCtx.fillStyle = '#b38022';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【出口】', cx + epBase.screenX, cy + epBase.screenY - 18);

  // -------------------------------------------------------------
  // 3 枚完全统一的神谕小图标（统一为金菱星芒印，整齐典雅）
  // -------------------------------------------------------------
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!f.collected) {
      const floatZ = 0.2 + Math.sin(time * 3 + i * 1.5) * 0.1;
      const p = project3DtoIso({ x: f.x, y: f.y, z: floatZ }, scale);
      const fx = cx + p.screenX;
      const fy = cy + p.screenY;

      // 柔和微光底晕
      omniCtx.fillStyle = 'rgba(212, 175, 55, 0.25)';
      omniCtx.beginPath();
      omniCtx.arc(fx, fy, 8, 0, Math.PI * 2);
      omniCtx.fill();

      // 统一神谕金菱星印
      omniCtx.strokeStyle = '#c8963e';
      omniCtx.lineWidth = 1.4;
      omniCtx.fillStyle = '#ffea88';
      omniCtx.beginPath();
      omniCtx.moveTo(fx, fy - 6);
      omniCtx.lineTo(fx + 5, fy);
      omniCtx.lineTo(fx, fy + 6);
      omniCtx.lineTo(fx - 5, fy);
      omniCtx.closePath();
      omniCtx.fill();
      omniCtx.stroke();

      // 中心金星点
      omniCtx.fillStyle = '#8c6d3b';
      omniCtx.beginPath();
      omniCtx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      omniCtx.fill();
    }
  }

  // -------------------------------------------------------------
  // 等腰士兵（底极窄 0.36，身长 2.5，冷铁黑曜石利刃）
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

    // 锋利长矛利刃身躯
    omniCtx.fillStyle = '#261010';
    omniCtx.strokeStyle = '#5a1a1a';
    omniCtx.lineWidth = 1.4;
    omniCtx.beginPath();
    omniCtx.moveTo(ax, ay);
    omniCtx.lineTo(blx, bly);
    omniCtx.lineTo(brx, bry);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // 中轴冷锋银痕
    const bMidX = (blx + brx) / 2;
    const bMidY = (bly + bry) / 2;
    omniCtx.strokeStyle = 'rgba(255, 230, 230, 0.7)';
    omniCtx.lineWidth = 1;
    omniCtx.beginPath();
    omniCtx.moveTo(ax, ay);
    omniCtx.lineTo(bMidX, bMidY);
    omniCtx.stroke();

    // 针尖微弱寒芒
    omniCtx.fillStyle = '#f87171';
    omniCtx.beginPath();
    omniCtx.arc(ax, ay, 1.8, 0, Math.PI * 2);
    omniCtx.fill();
  }

  // -------------------------------------------------------------
  // 正方形绅士（四等边·四直角，清晰大方 size 1.2）
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
    // 地面投影阴影
    omniCtx.fillStyle = 'rgba(26, 22, 17, 0.28)';
    omniCtx.beginPath();
    omniCtx.moveTo(groundPoints[0].x, groundPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(groundPoints[i].x, groundPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    // 4 条升维垂直柱棱光
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    omniCtx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      omniCtx.beginPath();
      omniCtx.moveTo(groundPoints[i].x, groundPoints[i].y);
      omniCtx.lineTo(airPoints[i].x, airPoints[i].y);
      omniCtx.stroke();
    }

    // 空中腾跃金光正方顶面
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
    omniCtx.fillStyle = '#1e293b';
    omniCtx.strokeStyle = '#dfba52';
    omniCtx.lineWidth = 2.2;
    omniCtx.beginPath();
    omniCtx.moveTo(groundPoints[0].x, groundPoints[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(groundPoints[i].x, groundPoints[i].y);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    // 内部同心学者方印
    const innerVerts = getSquareVertices(
      { x: game.player.x, y: game.player.y },
      game.player.size * 0.45,
      game.player.angle
    );
    const innerPts = innerVerts.map(pt => {
      const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
      return { x: cx + p.screenX, y: cy + p.screenY };
    });
    omniCtx.strokeStyle = 'rgba(223, 186, 82, 0.6)';
    omniCtx.lineWidth = 1;
    omniCtx.beginPath();
    omniCtx.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(innerPts[i].x, innerPts[i].y);
    omniCtx.closePath();
    omniCtx.stroke();

    const centerPoint = project3DtoIso({ x: game.player.x, y: game.player.y, z: 0 }, scale);
    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#1e293b';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('正方形绅士', cx + centerPoint.screenX, cy + centerPoint.screenY - 14);
  }

  // 前沿平直边短小典雅视标
  const centerP = project3DtoIso({ x: game.player.x, y: game.player.y, z: game.currentZ }, scale);
  const px = cx + centerP.screenX;
  const py = cy + centerP.screenY;
  const hDist = 1.8;
  const hx = game.player.x + Math.cos(game.player.angle) * hDist;
  const hy = game.player.y + Math.sin(game.player.angle) * hDist;
  const hp = project3DtoIso({ x: hx, y: hy, z: game.currentZ }, scale);

  omniCtx.strokeStyle = '#d4af37';
  omniCtx.lineWidth = 1.5;
  omniCtx.beginPath();
  omniCtx.moveTo(px, py);
  omniCtx.lineTo(cx + hp.screenX, cy + hp.screenY);
  omniCtx.stroke();

  const tipX = cx + hp.screenX;
  const tipY = cy + hp.screenY;
  omniCtx.fillStyle = '#d4af37';
  omniCtx.beginPath();
  omniCtx.moveTo(tipX, tipY - 3);
  omniCtx.lineTo(tipX + 2.5, tipY);
  omniCtx.lineTo(tipX, tipY + 3);
  omniCtx.lineTo(tipX - 2.5, tipY);
  omniCtx.closePath();
  omniCtx.fill();
}

// =========================================================================
// 下屏：第一人称迷雾真实物理光感（高对比度清晰视界，纯正几何辨角，绝无怪灯）
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

  // 中央一维感光视界槽（高度 26px，高对比度清晰可辨）
  const slotHeight = 26;
  const slotTop = horizonY - slotHeight / 2;

  // 视网膜槽纯净背景雾霭
  subjCtx.fillStyle = '#cfc3a9';
  subjCtx.fillRect(0, slotTop, w, slotHeight);

  // 面朝东面出口时的微光指引
  const angleNorm = (((game.player.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const facingEast = Math.max(0, Math.cos(angleNorm));
  if (facingEast > 0.4) {
    const dawnAlpha = (facingEast - 0.4) * 0.5;
    const dawnGrad = subjCtx.createLinearGradient(w / 2 - 50, 0, w / 2 + 50, 0);
    dawnGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    dawnGrad.addColorStop(0.5, `rgba(255, 235, 140, ${dawnAlpha})`);
    dawnGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    subjCtx.fillStyle = dawnGrad;
    subjCtx.fillRect(w / 2 - 50, slotTop, 100, slotHeight);
  }

  const rawRays = game.getFogRays(96);
  const rayCount = rawRays.length;
  const colWidth = w / rayCount;

  let isAnyIsoscelesNear = false;

  // 高对比度平滑微薄光带渲染（纯净冷峻物理对比，绝无大红圆球灯）
  for (let i = 0; i < rayCount; i++) {
    const ray = rawRays[i];
    if (ray.distance < Infinity) {
      const x = i * colWidth;
      // 物理光度：近处深沉凝练、远处融入背景迷雾
      const intensity = Math.max(0.12, Math.min(1.0, 1.0 - (ray.distance / 16)));

      if (ray.hitType === 'isosceles') {
        isAnyIsoscelesNear = true;
        const apexFactor = ray.apexProximity || 0;
        // 原著核心辨角物理：顶角最先刺透迷雾，呈现狭窄冷暗红折痕；两腰急剧后撤衰退
        const r = Math.round(130 + apexFactor * 60);
        const g = Math.round(25 - apexFactor * 10);
        const b = Math.round(25 - apexFactor * 10);
        const alpha = Math.min(0.95, intensity * (0.65 + apexFactor * 0.45));

        subjCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        // 石墙：平整均匀高对比度的深墨冷灰阴影
        const alpha = Math.min(0.9, intensity * 0.95);
        subjCtx.fillStyle = `rgba(26, 20, 16, ${alpha})`;
      }

      subjCtx.fillRect(x, slotTop, colWidth + 0.6, slotHeight);
    }
  }

  // 纯净视界槽青铜边框
  subjCtx.strokeStyle = '#8c6d3b';
  subjCtx.lineWidth = 1.4;
  subjCtx.strokeRect(0, slotTop, w, slotHeight);

  // 视网膜槽正中央基准线
  subjCtx.strokeStyle = 'rgba(140, 109, 59, 0.35)';
  subjCtx.lineWidth = 1;
  subjCtx.beginPath();
  subjCtx.moveTo(0, horizonY);
  subjCtx.lineTo(w, horizonY);
  subjCtx.stroke();

  // 视界上方古典辨形手稿
  subjCtx.font = '10px serif';
  subjCtx.textAlign = 'center';
  if (isAnyIsoscelesNear) {
    subjCtx.fillStyle = '#7a1818';
    subjCtx.fillText('【雾中辨角】“狭窄暗刃急剧隐入深雾——等腰士兵！”', w / 2, slotTop - 12);
  } else if (facingEast > 0.65) {
    subjCtx.fillStyle = '#b38022';
    subjCtx.fillText('【出口感召】“东方尽头微光拂动，乃石牢出口。”', w / 2, slotTop - 12);
  } else {
    subjCtx.fillStyle = '#5c4e3a';
    subjCtx.fillText('【雾中辨形】“平直深邃暗带，明暗均等——石牢坚壁。”', w / 2, slotTop - 12);
  }

  // -------------------------------------------------------------
  // 正方形绅士第一人称前沿 HUD (90° 直角与平直外壁刻度)
  // -------------------------------------------------------------
  const hudY = h - hudHeight;

  subjCtx.fillStyle = '#1e293b';
  subjCtx.fillRect(0, hudY, w, hudHeight);

  subjCtx.strokeStyle = '#c8963e';
  subjCtx.lineWidth = 2.5;
  subjCtx.beginPath();
  subjCtx.moveTo(0, hudY);
  subjCtx.lineTo(w, hudY);
  subjCtx.stroke();

  // 左右直角 90° 标志
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
