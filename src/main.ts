import { LevelCoordinator, GameLevelId } from '../assets/sub_gameplay/scripts/controllers/LevelCoordinator';
import { project3DtoIso } from '../assets/main/scripts/core/render/OmniscientProjection';
import { getSquareVertices } from '../assets/main/scripts/core/geometry/IsoscelesCollider';

const omniCanvas = document.getElementById('omni-canvas') as HTMLCanvasElement;
const subjCanvas = document.getElementById('subj-canvas') as HTMLCanvasElement;
const omniCtx = omniCanvas.getContext('2d')!;
const subjCtx = subjCanvas.getContext('2d')!;

const identityText = document.getElementById('identity-text')!;
const omniPanelTag = document.getElementById('omni-panel-tag')!;
const subjPanelTag = document.getElementById('subj-panel-tag')!;
const gaugeLabel = document.getElementById('gauge-label')!;
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
const btnLevelToggle = document.getElementById('btn-level-toggle')!;
const subjViewport = document.getElementById('subj-viewport')!;

const btnUp = document.getElementById('btn-up')!;
const btnDown = document.getElementById('btn-down')!;
const btnLeft = document.getElementById('btn-left')!;
const btnRight = document.getElementById('btn-right')!;

// 全局关卡协调器
const coordinator = new LevelCoordinator();
const lineland = coordinator.lineland;
const escapeGame = coordinator.escape;
const purgeGame = coordinator.purge;

// 直线国第一人称当前视线朝向：FORWARD(前视国王) | BACKWARD(后视邻人)
let linelandLookDir: 'FORWARD' | 'BACKWARD' = 'FORWARD';

// 第一幕（石牢脱逃）神谕金菱圣印
interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}
const fragments: Fragment[] = [
  { x: -2.4, y: 0, collected: false },
  { x: 0.6, y: -0.6, collected: false },
  { x: 2.8, y: 0.0, collected: false },
];

let hasTriggeredSphereEpiphany = false;

const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') {
    handleSpecialAction();
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
    const freqs = [130.81, 196.00, 261.63, 329.63, 392.00];
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

function handleSpecialAction(): void {
  if (coordinator.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
    if (lineland.canStepSideways) {
      lineland.stepSideways();
      dialogueStrip.textContent = '“【突破一维】你在不可思议的‘侧向’踏出一步，在直线上凭空消失！”';
    } else {
      dialogueStrip.textContent = '“尚未探明前后绝路！请先按 W 前进并按 S 后退以觉醒侧向感知！”';
    }
  } else if (coordinator.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
    const success = escapeGame.requestAscension();
    if (success) {
      dialogueStrip.textContent = '“【真言爆发】正方形拔地而起，俯瞰凡俗四壁！”';
    } else {
      dialogueStrip.textContent = '“心智尚未充盈！需探寻集齐 3 枚神谕残片方可升维！”';
    }
  } else {
    const success = purgeGame.requestAscension();
    if (success) {
      dialogueStrip.textContent = '“【高维飞跃】球体导师神光护体！你超脱二维议会街区，翱翔于虚空之上！”';
    } else {
      dialogueStrip.textContent = '“虚空灵力不足！需在五边形街道避开针刺并搜集全部 3 枚符印方可飞升！”';
    }
  }
}

btnAscend.addEventListener('click', handleSpecialAction);

// 弹窗状态管理：INTRO(开场背景) | VICTORY(通关手稿) | DEFEATED(身死残局)
type ModalMode = 'INTRO' | 'VICTORY' | 'DEFEATED' | 'NONE';
let currentModalMode: ModalMode = 'INTRO';

function showIntroManuscript(): void {
  currentModalMode = 'INTRO';
  modalOverlay.classList.add('active');
  const intro = coordinator.introManuscript;
  modalTitle.textContent = intro.title;
  modalBody.textContent = intro.body;
  btnModalAction.textContent = intro.btnText;
}

// 关卡流转与重置
function resetCurrentLevel(): void {
  coordinator.resetCurrentLevel();
  hasTriggeredSphereEpiphany = false;
  for (const f of fragments) f.collected = false;

  updateLevelHeaderUI();
  if (coordinator.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
    dialogueStrip.textContent = lineland.soliloquy;
  } else if (coordinator.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
    dialogueStrip.textContent = '“【正方形绅士】四面封闭石墙将你闭锁。请前行拾取神谕金印！”';
  } else {
    dialogueStrip.textContent = '“【正方形绅士】议会戒严！小心隐形针刺与祭司圣光，搜集3枚符印飞升！”';
  }
}

function toggleLevel(): void {
  const nextId = ((coordinator.currentLevelId + 1) % 3) as GameLevelId;
  coordinator.switchLevel(nextId);
  resetCurrentLevel();
  showIntroManuscript();
}

btnLevelToggle.addEventListener('click', toggleLevel);
btnQuickReset.addEventListener('click', () => {
  resetCurrentLevel();
  showIntroManuscript();
});

btnModalAction.addEventListener('click', () => {
  modalOverlay.classList.remove('active');
  if (currentModalMode === 'INTRO') {
    currentModalMode = 'NONE';
    // 玩家已了解背景，正式开启行动
  } else if (currentModalMode === 'VICTORY') {
    currentModalMode = 'NONE';
    coordinator.advanceToNextLevel();
    resetCurrentLevel();
    showIntroManuscript(); // 紧接着展示新关卡的开场背景手稿！
  } else {
    currentModalMode = 'NONE';
    resetCurrentLevel();
  }
});

function updateLevelHeaderUI(): void {
  const cfg = coordinator.currentLevelConfig;
  identityText.textContent = cfg.identityText;
  omniPanelTag.textContent = cfg.omniTag;
  subjPanelTag.textContent = cfg.subjTag;
}

updateLevelHeaderUI();
showIntroManuscript();

// 主循环
let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  let forward = 0;
  let turn = 0;
  if (currentModalMode === 'NONE') {
    if (keys['w'] || keys['arrowup']) forward += 1;
    if (keys['s'] || keys['arrowdown']) forward -= 1;
    if (keys['a'] || keys['arrowleft']) turn -= 1;
    if (keys['d'] || keys['arrowright']) turn += 1;
  }

  if (coordinator.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
    // -------------------------------------------------------------
    // 序幕：直线国之梦逻辑更新（遵从原著与新物理规律）
    // -------------------------------------------------------------
    // 1. W / S 控制沿直线前进与后退
    if (forward !== 0) {
      lineland.moveAxis(forward, dt);
      if (forward > 0) {
        linelandLookDir = 'FORWARD';
      } else {
        linelandLookDir = 'BACKWARD';
      }
    }

    // 2. A / D 控制向线段两侧侧移（只有前后都移动过才解锁）
    if (turn !== 0) {
      if (lineland.canStepSideways) {
        // A (turn < 0): 向左上侧面 (+1)；D (turn > 0): 向右下侧面 (-1)
        const lateralDir = turn < 0 ? 1 : -1;
        lineland.moveLateral(lateralDir, dt);
      } else {
        dialogueStrip.textContent = '“【心智局限】你尚未探明前后绝路！请先按 W 前进并按 S 后退探寻生路！”';
      }
    }

    coordinator.update(dt);
    dialogueStrip.textContent = lineland.soliloquy;

    // 水银管：展示探索进度与死锁觉醒
    gaugeLabel.textContent = '探索:';
    if (lineland.isSidestepping) {
      mercuryBar.style.width = '100%';
      gaugeLabel.textContent = '高维:';
    } else if (lineland.canStepSideways) {
      mercuryBar.style.width = '100%';
      gaugeLabel.textContent = '觉醒:';
    } else {
      let progress = 0;
      if (lineland.hasMovedForward) progress += 50;
      if (lineland.hasMovedBackward) progress += 50;
      mercuryBar.style.width = `${progress}%`;
    }

    // 右下角按钮觉醒逻辑
    if (lineland.isSidestepping) {
      btnAscend.classList.remove('btn-sealed');
      btnAscend.classList.add('charged');
      btnAscendText.textContent = '已遁入侧面';
      btnAscendSub.textContent = '(奔向梦境裂隙)';
    } else if (lineland.canStepSideways) {
      btnAscend.classList.remove('btn-sealed');
      btnAscend.classList.add('charged');
      btnAscendText.textContent = '按 A 或 D 侧移';
      btnAscendSub.textContent = '(维度觉醒 · 脱离直线)';
    } else {
      btnAscend.classList.add('btn-sealed');
      btnAscend.classList.remove('charged');
      btnAscendText.textContent = '一维局限中';
      btnAscendSub.textContent = '(需先试探 W 与 S)';
    }

    // 结算判定
    if (lineland.gameState === 'VICTORY' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'VICTORY';
      modalOverlay.classList.add('active');
      const ms = coordinator.completionManuscript;
      modalTitle.textContent = ms.title;
      modalBody.textContent = ms.body;
      btnModalAction.textContent = ms.nextBtnText;
    } else if (lineland.gameState === 'DEFEATED' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'DEFEATED';
      modalOverlay.classList.add('active');
      modalTitle.textContent = '梦境幻灭 · 被刺解体';
      modalBody.textContent = '“你在前后两端极其狭窄的线段挤压下被两端刺穿。请重新闭目凝神，在前后死锁的一刹那向侧面迈步！”';
      btnModalAction.textContent = '重聚梦魂';
    }

    renderLinelandOmniView();
    renderLinelandSubjView();

  } else if (coordinator.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
    // -------------------------------------------------------------
    // 第一幕：平面国石牢脱逃逻辑更新
    // -------------------------------------------------------------
    if (currentModalMode === 'NONE') {
      escapeGame.movePlayer(forward, turn, dt);
    }

    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      if (!f.collected) {
        const d = Math.hypot(escapeGame.player.x - f.x, escapeGame.player.y - f.y);
        if (d < 1.3) {
          f.collected = true;
          escapeGame.addEnergy(35);
          if (i === 0) {
            dialogueStrip.textContent = '“【神谕初启】四等边平直均等之身，何必拘泥于平面之锁？”';
          } else if (i === 1) {
            dialogueStrip.textContent = '“【真理渐明】等腰暴徒唯知盲目前冲，不知天地尚有上下！”';
          } else {
            hasTriggeredSphereEpiphany = true;
            dialogueStrip.textContent = '【球体导师之神谕】“愚钝的正方形！既不可向南，亦不可向北！向上，向第三维度飞升！”';
            playSphereOracleAudio();
          }
        }
      }
    }

    const { isNearMiss } = escapeGame.update(dt);
    if (isNearMiss && !hasTriggeredSphereEpiphany) {
      dialogueStrip.textContent = '“【锐角警报！】等腰士兵的致命尖角在雾中逼近！”';
    }

    gaugeLabel.textContent = '神谕:';
    mercuryBar.style.width = `${escapeGame.energy}%`;
    if (escapeGame.energy >= 100) {
      btnAscend.classList.remove('btn-sealed');
      btnAscend.classList.add('charged');
      btnAscendText.textContent = '向上，而不是向北';
      btnAscendSub.textContent = '(神谕觉醒 · 腾空飞升)';
    } else {
      btnAscend.classList.add('btn-sealed');
      btnAscend.classList.remove('charged');
      btnAscendText.textContent = '心智冥思中';
      btnAscendSub.textContent = `(集神谕: ${Math.round(escapeGame.energy)}%)`;
    }

    if (escapeGame.gameState === 'VICTORY' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'VICTORY';
      modalOverlay.classList.add('active');
      const ms = coordinator.completionManuscript;
      modalTitle.textContent = ms.title;
      modalBody.textContent = ms.body;
      btnModalAction.textContent = ms.nextBtnText;
    } else if (escapeGame.gameState === 'DEFEATED' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'DEFEATED';
      modalOverlay.classList.add('active');
      modalTitle.textContent = '身死道消 · 刺杀残局';
      modalBody.textContent = escapeGame.defeatManuscript;
      btnModalAction.textContent = '重聚肉身';
    }

    const juiceFrame = escapeGame.juice.update(dt);
    subjViewport.style.transform = `translate(${juiceFrame.offsetX}px, ${juiceFrame.offsetY}px)`;

    renderOmniscientView();
    renderSubjectiveFogView();

  } else {
    // -------------------------------------------------------------
    // 第二幕：议会大清洗逻辑更新（针形刺客、圆形祭司与高维飞升）
    // -------------------------------------------------------------
    if (currentModalMode === 'NONE') {
      purgeGame.movePlayer(forward, turn, dt);
    }

    // 收集高维接引符印
    for (let i = 0; i < purgeGame.tokens.length; i++) {
      const t = purgeGame.tokens[i];
      if (!t.collected) {
        const d = Math.hypot(purgeGame.player.x - t.x, purgeGame.player.y - t.y);
        if (d < 1.3) {
          t.collected = true;
          purgeGame.energy = Math.min(100, purgeGame.energy + 35);
          if (i === 0) {
            dialogueStrip.textContent = '“【虚空真印】五边形街道锁不住更高维度的法则！”';
          } else if (i === 1) {
            dialogueStrip.textContent = '“【圣光破妄】圆形祭司的虚妄光环在天界真理前微不足道！”';
          } else {
            dialogueStrip.textContent = '“【高维接引】符印已齐！立即按空格键或点击右下角飞升跃过封锁！”';
          }
        }
      }
    }

    purgeGame.update(dt);

    gaugeLabel.textContent = '符印:';
    mercuryBar.style.width = `${purgeGame.energy}%`;
    if (purgeGame.isAscended) {
      btnAscend.classList.remove('btn-sealed');
      btnAscend.classList.add('charged');
      btnAscendText.textContent = '翱翔虚空中';
      btnAscendSub.textContent = '(飞跃议会 · 奔向法阵)';
    } else if (purgeGame.energy >= 100) {
      btnAscend.classList.remove('btn-sealed');
      btnAscend.classList.add('charged');
      btnAscendText.textContent = '突破议会戒严';
      btnAscendSub.textContent = '(符印充盈 · 腾空飞跃)';
    } else {
      btnAscend.classList.add('btn-sealed');
      btnAscend.classList.remove('charged');
      btnAscendText.textContent = '搜集符印中';
      btnAscendSub.textContent = `(集符印: ${Math.round(purgeGame.energy)}%)`;
    }

    if (purgeGame.gameState === 'VICTORY' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'VICTORY';
      modalOverlay.classList.add('active');
      const ms = coordinator.completionManuscript;
      modalTitle.textContent = ms.title;
      modalBody.textContent = ms.body;
      btnModalAction.textContent = ms.nextBtnText;
    } else if (purgeGame.gameState === 'DEFEATED' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'DEFEATED';
      modalOverlay.classList.add('active');
      modalTitle.textContent = '肉身破碎 · 针刺之殇';
      modalBody.textContent = purgeGame.defeatManuscript;
      btnModalAction.textContent = '重聚肉身';
    }

    const juiceFrame = purgeGame.juice.update(dt);
    subjViewport.style.transform = `translate(${juiceFrame.offsetX}px, ${juiceFrame.offsetY}px)`;

    renderPurgeOmniView();
    renderPurgeSubjView();
  }

  requestAnimationFrame(gameLoop);
}

// =========================================================================
// 序幕渲染：直线国之梦（倾斜沙盘 + 原著线段/质点 + 物理第一人称变换）
// =========================================================================
function renderLinelandOmniView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  // 古典羊皮纸底色
  omniCtx.fillStyle = '#f8f4e8';
  omniCtx.fillRect(0, 0, w, h);

  // 1. 直线轴线：从左下到右上倾斜
  // 起点 P1 = (45, h - 45)，终点 P2 = (w - 45, 45)
  const pStart = { x: 45, y: h - 45 };
  const pEnd = { x: w - 45, y: 45 };

  const dx = pEnd.x - pStart.x;
  const dy = pEnd.y - pStart.y;
  const theta = Math.atan2(dy, dx);
  const u = { x: Math.cos(theta), y: Math.sin(theta) }; // 轴向单位向量（向右上）
  const v = { x: u.y, y: -u.x }; // 侧向单位向量（垂直向左上）

  const pCenter = { x: (pStart.x + pEnd.x) / 2 - 15, y: (pStart.y + pEnd.y) / 2 + 10 };
  const axisScale = 17.5;
  const latScale = 24.0;

  function toScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: pCenter.x + x * axisScale * u.x + y * latScale * v.x,
      y: pCenter.y + x * axisScale * u.y + y * latScale * v.y,
    };
  }

  // 绘制单一直线基准轴
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.22)';
  omniCtx.lineWidth = 14;
  omniCtx.lineCap = 'round';
  omniCtx.beginPath();
  omniCtx.moveTo(pStart.x, pStart.y);
  omniCtx.lineTo(pEnd.x, pEnd.y);
  omniCtx.stroke();

  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 2.6;
  omniCtx.beginPath();
  omniCtx.moveTo(pStart.x, pStart.y);
  omniCtx.lineTo(pEnd.x, pEnd.y);
  omniCtx.stroke();

  // 刻度线
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.45)';
  omniCtx.lineWidth = 1;
  for (let x = -6; x <= 8; x += 1) {
    const sp = toScreen(x, 0);
    omniCtx.beginPath();
    omniCtx.moveTo(sp.x - v.x * 5, sp.y - v.y * 5);
    omniCtx.lineTo(sp.x + v.x * 5, sp.y + v.y * 5);
    omniCtx.stroke();
  }

  // 直线终点王国边界
  omniCtx.font = '10px serif';
  omniCtx.fillStyle = '#7a6344';
  omniCtx.textAlign = 'right';
  omniCtx.fillText('王国极境', pEnd.x + 8, pEnd.y - 10);

  // 2. 暴躁邻人（位于左下）
  const nbrPt = toScreen(lineland.neighbor.x, 0);
  const time = Date.now() / 400;

  // 邻人警示红芒光圈
  const nbrGlow = 8 + (Math.sin(time * 4) + 1) * 3;
  omniCtx.fillStyle = 'rgba(180, 30, 30, 0.22)';
  omniCtx.beginPath();
  omniCtx.arc(nbrPt.x, nbrPt.y, nbrGlow, 0, Math.PI * 2);
  omniCtx.fill();

  // 质点刺尖徽记
  omniCtx.strokeStyle = '#8b1e1e';
  omniCtx.lineWidth = 1.6;
  omniCtx.beginPath();
  omniCtx.moveTo(nbrPt.x - 7 * u.x, nbrPt.y - 7 * u.y);
  omniCtx.lineTo(nbrPt.x + 7 * u.x, nbrPt.y + 7 * u.y);
  omniCtx.moveTo(nbrPt.x - 5 * v.x, nbrPt.y - 5 * v.y);
  omniCtx.lineTo(nbrPt.x + 5 * v.x, nbrPt.y + 5 * v.y);
  omniCtx.stroke();

  // 质点纯红核心
  omniCtx.fillStyle = '#e11d48';
  omniCtx.beginPath();
  omniCtx.arc(nbrPt.x, nbrPt.y, 4, 0, Math.PI * 2);
  omniCtx.fill();
  omniCtx.strokeStyle = '#881337';
  omniCtx.lineWidth = 1.2;
  omniCtx.stroke();

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#8b1e1e';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('暴躁邻人', nbrPt.x - v.x * 16, nbrPt.y - v.y * 16);

  // 3. 线之国王（位于右上）
  const kStart = toScreen(lineland.king.startX, 0);
  const kEnd = toScreen(lineland.king.endX, 0);

  // 国王皇室金色光晕
  omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  omniCtx.lineWidth = 12;
  omniCtx.lineCap = 'round';
  omniCtx.beginPath();
  omniCtx.moveTo(kStart.x, kStart.y);
  omniCtx.lineTo(kEnd.x, kEnd.y);
  omniCtx.stroke();

  // 国王金色长线段本体
  omniCtx.strokeStyle = '#b38022';
  omniCtx.lineWidth = 5;
  omniCtx.lineCap = 'round';
  omniCtx.beginPath();
  omniCtx.moveTo(kStart.x, kStart.y);
  omniCtx.lineTo(kEnd.x, kEnd.y);
  omniCtx.stroke();

  // 国王内沿细金纹
  omniCtx.strokeStyle = '#fef08a';
  omniCtx.lineWidth = 1.8;
  omniCtx.beginPath();
  omniCtx.moveTo(kStart.x, kStart.y);
  omniCtx.lineTo(kEnd.x, kEnd.y);
  omniCtx.stroke();

  // 国王两端皇室端点徽印
  for (const pt of [kStart, kEnd]) {
    omniCtx.fillStyle = '#d4af37';
    omniCtx.strokeStyle = '#5a3d0e';
    omniCtx.lineWidth = 1.2;
    omniCtx.beginPath();
    omniCtx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
    omniCtx.fill();
    omniCtx.stroke();
  }

  // 国王同心声阶环
  const waveR = 8 + (Math.sin(time * 3) + 1) * 4;
  omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  omniCtx.lineWidth = 1;
  omniCtx.beginPath();
  omniCtx.arc(kStart.x, kStart.y, waveR, 0, Math.PI * 2);
  omniCtx.stroke();

  const kMid = { x: (kStart.x + kEnd.x) / 2, y: (kStart.y + kEnd.y) / 2 };
  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#7a5214';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('线之国王', kMid.x + v.x * 16, kMid.y + v.y * 16);

  // 4. 梦境裂隙（出口）
  const exitPt = toScreen(lineland.exitX, 0);
  omniCtx.strokeStyle = '#d4af37';
  omniCtx.lineWidth = 2.2;
  omniCtx.beginPath();
  omniCtx.moveTo(exitPt.x - 8 * u.x, exitPt.y - 8 * u.y);
  omniCtx.lineTo(exitPt.x + 8 * v.x, exitPt.y + 8 * v.y);
  omniCtx.lineTo(exitPt.x + 8 * u.x, exitPt.y + 8 * u.y);
  omniCtx.lineTo(exitPt.x - 8 * v.x, exitPt.y - 8 * v.y);
  omniCtx.closePath();
  omniCtx.stroke();

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#b38022';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('梦境裂隙', exitPt.x + v.x * 20, exitPt.y + v.y * 20);

  // 5. 正方形绅士：原著设定在直线国呈现为【一条学者线段】
  const p1 = toScreen(lineland.player.x - lineland.player.length / 2, lineland.player.y);
  const p2 = toScreen(lineland.player.x + lineland.player.length / 2, lineland.player.y);
  const pMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  // 若处于侧移状态，绘制高维投影虚线导轨
  if (lineland.isSidestepping) {
    const orig1 = toScreen(lineland.player.x - lineland.player.length / 2, 0);
    const orig2 = toScreen(lineland.player.x + lineland.player.length / 2, 0);

    omniCtx.setLineDash([3, 3]);
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
    omniCtx.lineWidth = 1.2;
    omniCtx.beginPath();
    omniCtx.moveTo(orig1.x, orig1.y);
    omniCtx.lineTo(p1.x, p1.y);
    omniCtx.moveTo(orig2.x, orig2.y);
    omniCtx.lineTo(p2.x, p2.y);
    omniCtx.stroke();
    omniCtx.setLineDash([]);

    // 侧移发光辉晕
    omniCtx.fillStyle = 'rgba(212, 175, 55, 0.2)';
    omniCtx.beginPath();
    omniCtx.arc(pMid.x, pMid.y, 16, 0, Math.PI * 2);
    omniCtx.fill();
  }

  // 绘制主角学者线段（温润象牙米白 + 双层金色封边）
  omniCtx.strokeStyle = '#b38022';
  omniCtx.lineWidth = 4.2;
  omniCtx.lineCap = 'round';
  omniCtx.beginPath();
  omniCtx.moveTo(p1.x, p1.y);
  omniCtx.lineTo(p2.x, p2.y);
  omniCtx.stroke();

  omniCtx.strokeStyle = '#fcfbf7';
  omniCtx.lineWidth = 2.0;
  omniCtx.beginPath();
  omniCtx.moveTo(p1.x, p1.y);
  omniCtx.lineTo(p2.x, p2.y);
  omniCtx.stroke();

  // 主角两端金色学者端点
  for (const pt of [p1, p2]) {
    omniCtx.fillStyle = '#d4af37';
    omniCtx.beginPath();
    omniCtx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    omniCtx.fill();
  }

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#3e2c14';
  omniCtx.textAlign = 'center';
  if (lineland.isSidestepping) {
    omniCtx.fillText('我（跨越一维）', pMid.x - v.x * 18, pMid.y - v.y * 18);
  } else {
    omniCtx.fillText('我（正方形截面）', pMid.x - v.x * 18, pMid.y - v.y * 18);
  }
}

// =========================================================================
// 序幕第一人称渲染：遵从物理规则的前后视角变换
// =========================================================================
function renderLinelandSubjView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  subjCtx.fillStyle = '#1c1813';
  subjCtx.fillRect(0, 0, w, h);

  const hudHeight = 36;
  const horizonY = (h - hudHeight) / 2;
  const slotHeight = 13; // 统一 13px 纤薄视网膜槽
  const slotTop = horizonY - slotHeight / 2;

  // 纯正一维背景
  subjCtx.fillStyle = '#2d2720';
  subjCtx.fillRect(0, slotTop, w, slotHeight);

  const centerX = w / 2;

  if (lineland.isSidestepping) {
    // 突破一维后的高维侧面视野（浅金晨曦流光开阔）
    subjCtx.fillStyle = 'rgba(212, 175, 55, 0.45)';
    subjCtx.fillRect(0, slotTop, w, slotHeight);
  } else {
    // 遵从物理规则的一维前后视网膜
    if (linelandLookDir === 'FORWARD') {
      // -----------------------------------------------------------
      // 前视：正视前方线之国王（长线段端点在视网膜中心形成金色辉光）
      // -----------------------------------------------------------
      const distToKing = Math.max(0.1, lineland.king.startX - (lineland.player.x + lineland.player.length / 2));
      const intensity = Math.max(0.12, Math.min(1.0, 1.0 - (distToKing / 8.0)));

      // 遵循 Beer-Lambert 衰减物理光度
      const spotW = Math.round(6 + intensity * 45);
      const grad = subjCtx.createRadialGradient(centerX, horizonY, 1, centerX, horizonY, spotW);
      grad.addColorStop(0, `rgba(255, 235, 140, ${0.45 + intensity * 0.55})`);
      grad.addColorStop(0.5, `rgba(212, 175, 55, ${intensity * 0.45})`);
      grad.addColorStop(1, 'rgba(45, 39, 32, 0)');

      subjCtx.fillStyle = grad;
      subjCtx.fillRect(centerX - spotW, slotTop, spotW * 2, slotHeight);

    } else {
      // -----------------------------------------------------------
      // 后视：回视后方暴躁邻人（微小尖锐质点在视网膜中心投下暗红针芒）
      // -----------------------------------------------------------
      const distToNbr = Math.max(0.1, (lineland.player.x - lineland.player.length / 2) - lineland.neighbor.x);
      const intensity = Math.max(0.15, Math.min(1.0, 1.0 - (distToNbr / 8.0)));

      const spotW = Math.round(3 + intensity * 24);
      const grad = subjCtx.createRadialGradient(centerX, horizonY, 0.5, centerX, horizonY, spotW);
      grad.addColorStop(0, `rgba(244, 63, 94, ${0.5 + intensity * 0.5})`);
      grad.addColorStop(0.6, `rgba(180, 30, 30, ${intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(45, 39, 32, 0)');

      subjCtx.fillStyle = grad;
      subjCtx.fillRect(centerX - spotW, slotTop, spotW * 2, slotHeight);
    }
  }

  // 视网膜青铜边框
  subjCtx.strokeStyle = '#8c6d3b';
  subjCtx.lineWidth = 1.2;
  subjCtx.strokeRect(0, slotTop, w, slotHeight);

  // 视网膜中心基准准星
  subjCtx.fillStyle = 'rgba(212, 175, 55, 0.7)';
  subjCtx.beginPath();
  subjCtx.arc(centerX, horizonY, 2, 0, Math.PI * 2);
  subjCtx.fill();

  // 底部 HUD 状态与物理提示
  subjCtx.fillStyle = '#0f172a';
  subjCtx.fillRect(0, h - hudHeight, w, hudHeight);

  subjCtx.font = '11px serif';
  subjCtx.textAlign = 'center';

  if (lineland.isSidestepping) {
    subjCtx.fillStyle = '#fde047';
    subjCtx.fillText('【二维侧面展开】已超越一维直线！直线上众生无法企及的高维视野！', centerX, h - 14);
  } else if (linelandLookDir === 'FORWARD') {
    subjCtx.fillStyle = 'rgba(212, 175, 55, 0.9)';
    const distToKing = (lineland.king.startX - (lineland.player.x + lineland.player.length / 2)).toFixed(1);
    subjCtx.fillText(`【一维前沿正视】正视线之国王之金辉 (前距: ${distToKing})`, centerX, h - 14);
  } else {
    subjCtx.fillStyle = 'rgba(244, 63, 94, 0.9)';
    const distToNbr = ((lineland.player.x - lineland.player.length / 2) - lineland.neighbor.x).toFixed(1);
    subjCtx.fillText(`【一维后沿回视】回视暴躁邻人之暗红针芒 (后距: ${distToNbr})`, centerX, h - 14);
  }
}

// =========================================================================
// 第一幕渲染：平面国石牢脱逃（保持原有验证通过的完整渲染）
// =========================================================================
function renderOmniscientView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 25;
  const scale = 15.2;

  omniCtx.fillStyle = '#f8f4e8';
  omniCtx.fillRect(0, 0, w, h);

  // 雅致同心星轨罗盘底纹
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.15)';
  omniCtx.lineWidth = 1;
  const radii = [3.0, 5.0];
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
  for (let x = -5.2; x <= 5.2; x += 1.8) {
    const p1 = project3DtoIso({ x, y: -5.2, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 5.2, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -5.2; y <= 5.2; y += 1.8) {
    const p1 = project3DtoIso({ x: -5.2, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 5.2, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // 平整封闭石墙
  const wallCorners = [
    { x: -5.2, y: -5.2 },
    { x: -5.2, y: 5.2 },
    { x: 5.2, y: 5.2 },
    { x: 5.2, y: -5.2 },
  ];
  const screenCorners = wallCorners.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 3.2;
  omniCtx.beginPath();
  omniCtx.moveTo(screenCorners[0].x, screenCorners[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(screenCorners[i].x, screenCorners[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  omniCtx.strokeStyle = 'rgba(200, 150, 62, 0.65)';
  omniCtx.lineWidth = 1.2;
  omniCtx.stroke();

  // 独立开阔的高维拱门出口
  const exitPos = escapeGame.exit;
  const epBase = project3DtoIso({ x: exitPos.x, y: exitPos.y, z: 0 }, scale);
  const exX = cx + epBase.screenX;
  const exY = cy + epBase.screenY;

  omniCtx.font = 'bold 11px serif';
  omniCtx.fillStyle = '#b38022';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【出口】', exX, exY - 22);

  omniCtx.fillStyle = 'rgba(212, 175, 55, 0.25)';
  omniCtx.beginPath();
  omniCtx.ellipse(exX, exY + 4, 14, 5, 0, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.strokeStyle = '#c8963e';
  omniCtx.lineWidth = 2;
  omniCtx.fillStyle = 'rgba(254, 240, 138, 0.7)';
  omniCtx.beginPath();
  omniCtx.moveTo(exX - 8, exY + 4);
  omniCtx.lineTo(exX - 8, exY - 10);
  omniCtx.arc(exX, exY - 10, 8, Math.PI, 0, false);
  omniCtx.lineTo(exX + 8, exY + 4);
  omniCtx.closePath();
  omniCtx.fill();
  omniCtx.stroke();

  // 左上角浑天球神谕盘
  const globeX = 38;
  const globeY = 44;
  const globeR = 20;

  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.6)';
  omniCtx.lineWidth = 1.5;
  omniCtx.beginPath();
  omniCtx.arc(globeX, globeY, globeR + 3, 0, Math.PI * 2);
  omniCtx.stroke();

  const globeGrad = omniCtx.createRadialGradient(
    globeX - 6, globeY - 6, 2,
    globeX, globeY, globeR
  );
  if (escapeGame.energy >= 100) {
    globeGrad.addColorStop(0, '#ffffff');
    globeGrad.addColorStop(0.3, '#60a5fa');
    globeGrad.addColorStop(0.8, '#1d4ed8');
    globeGrad.addColorStop(1, '#0f172a');
  } else {
    const fillRatio = escapeGame.energy / 100;
    globeGrad.addColorStop(0, '#93c5fd');
    globeGrad.addColorStop(Math.max(0.1, fillRatio), '#2563eb');
    globeGrad.addColorStop(1, '#0f172a');
  }

  omniCtx.fillStyle = globeGrad;
  omniCtx.beginPath();
  omniCtx.arc(globeX, globeY, globeR, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.font = 'bold 9px serif';
  omniCtx.fillStyle = '#64748b';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【球体神谕】', globeX, globeY + globeR + 11);

  // 3 枚完全统一的神谕金菱星印
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (f.collected) continue;
    const p = project3DtoIso({ x: f.x, y: f.y, z: 0 }, scale);
    const fx = cx + p.screenX;
    const fy = cy + p.screenY;

    omniCtx.fillStyle = 'rgba(212, 175, 55, 0.28)';
    omniCtx.beginPath();
    omniCtx.arc(fx, fy, 10, 0, Math.PI * 2);
    omniCtx.fill();

    omniCtx.fillStyle = '#fef08a';
    omniCtx.strokeStyle = '#b38022';
    omniCtx.lineWidth = 1.5;
    omniCtx.beginPath();
    omniCtx.moveTo(fx, fy - 7);
    omniCtx.lineTo(fx + 5, fy);
    omniCtx.lineTo(fx, fy + 7);
    omniCtx.lineTo(fx - 5, fy);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();
  }

  // 巡逻兵（等腰三角形）
  for (const patrol of escapeGame.patrols) {
    const tri = patrol.currentTriangle;
    const a = project3DtoIso({ x: tri.apex.x, y: tri.apex.y, z: 0 }, scale);
    const bl = project3DtoIso({ x: tri.baseLeft.x, y: tri.baseLeft.y, z: 0 }, scale);
    const br = project3DtoIso({ x: tri.baseRight.x, y: tri.baseRight.y, z: 0 }, scale);

    omniCtx.fillStyle = '#260a0a';
    omniCtx.strokeStyle = '#8b1e1e';
    omniCtx.lineWidth = 1.8;
    omniCtx.beginPath();
    omniCtx.moveTo(cx + a.screenX, cy + a.screenY);
    omniCtx.lineTo(cx + bl.screenX, cy + bl.screenY);
    omniCtx.lineTo(cx + br.screenX, cy + br.screenY);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();

    omniCtx.fillStyle = '#e11d48';
    omniCtx.beginPath();
    omniCtx.arc(cx + a.screenX, cy + a.screenY, 2.5, 0, Math.PI * 2);
    omniCtx.fill();
  }

  // 正方形绅士与 60° 扇形视野范围
  const centerP = project3DtoIso({ x: escapeGame.player.x, y: escapeGame.player.y, z: escapeGame.currentZ }, scale);
  const px = cx + centerP.screenX;
  const py = cy + centerP.screenY;

  // 60° 扇形视锥
  const halfFov = Math.PI / 6;
  const coneDist = 3.6;
  const coneP1 = project3DtoIso({
    x: escapeGame.player.x + Math.cos(escapeGame.player.angle - halfFov) * coneDist,
    y: escapeGame.player.y + Math.sin(escapeGame.player.angle - halfFov) * coneDist,
    z: escapeGame.currentZ,
  }, scale);
  const coneMid = project3DtoIso({
    x: escapeGame.player.x + Math.cos(escapeGame.player.angle) * coneDist * 1.08,
    y: escapeGame.player.y + Math.sin(escapeGame.player.angle) * coneDist * 1.08,
    z: escapeGame.currentZ,
  }, scale);
  const coneP2 = project3DtoIso({
    x: escapeGame.player.x + Math.cos(escapeGame.player.angle + halfFov) * coneDist,
    y: escapeGame.player.y + Math.sin(escapeGame.player.angle + halfFov) * coneDist,
    z: escapeGame.currentZ,
  }, scale);

  const coneGrad = omniCtx.createRadialGradient(px, py, 4, px, py, 60);
  coneGrad.addColorStop(0, 'rgba(212, 175, 55, 0.28)');
  coneGrad.addColorStop(0.7, 'rgba(212, 175, 55, 0.12)');
  coneGrad.addColorStop(1, 'rgba(212, 175, 55, 0.0)');

  omniCtx.fillStyle = coneGrad;
  omniCtx.beginPath();
  omniCtx.moveTo(px, py);
  omniCtx.lineTo(cx + coneP1.screenX, cy + coneP1.screenY);
  omniCtx.quadraticCurveTo(cx + coneMid.screenX, cy + coneMid.screenY, cx + coneP2.screenX, cy + coneP2.screenY);
  omniCtx.closePath();
  omniCtx.fill();

  // 正方形多边形
  const verts = getSquareVertices(
    { x: escapeGame.player.x, y: escapeGame.player.y },
    escapeGame.player.size,
    escapeGame.player.angle
  );
  const scrVerts = verts.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: escapeGame.currentZ }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  omniCtx.fillStyle = '#fcfbf7';
  omniCtx.strokeStyle = '#b38022';
  omniCtx.lineWidth = 1.8;
  omniCtx.beginPath();
  omniCtx.moveTo(scrVerts[0].x, scrVerts[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(scrVerts[i].x, scrVerts[i].y);
  omniCtx.closePath();
  omniCtx.fill();
  omniCtx.stroke();

  // 细金方印
  const innerVerts = getSquareVertices(
    { x: escapeGame.player.x, y: escapeGame.player.y },
    escapeGame.player.size * 0.45,
    escapeGame.player.angle
  );
  const innerPts = innerVerts.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });
  omniCtx.strokeStyle = '#d4af37';
  omniCtx.lineWidth = 1.2;
  omniCtx.beginPath();
  omniCtx.moveTo(innerPts[0].x, innerPts[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(innerPts[i].x, innerPts[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  const centerPoint = project3DtoIso({ x: escapeGame.player.x, y: escapeGame.player.y, z: 0 }, scale);
  omniCtx.fillStyle = '#b38022';
  omniCtx.beginPath();
  omniCtx.arc(cx + centerPoint.screenX, cy + centerPoint.screenY, 2, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#3e2c14';
  omniCtx.textAlign = 'left';
  omniCtx.fillText('正方形绅士', cx + centerPoint.screenX + 16, cy + centerPoint.screenY + 3);
}

function renderSubjectiveFogView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  subjCtx.fillStyle = '#1c1813';
  subjCtx.fillRect(0, 0, w, h);

  const hudHeight = 36;
  const horizonY = (h - hudHeight) / 2;
  const slotHeight = 13;
  const slotTop = horizonY - slotHeight / 2;

  subjCtx.fillStyle = '#c5b89c';
  subjCtx.fillRect(0, slotTop, w, slotHeight);

  // 射线投射
  const rayCount = 180;
  const rawRays = escapeGame.castRays(rayCount);
  const colWidth = w / rayCount;

  for (let i = 0; i < rayCount; i++) {
    const ray = rawRays[i];
    if (ray.distance < Infinity) {
      const x = i * colWidth;
      const intensity = Math.max(0.12, Math.min(1.0, 1.0 - (ray.distance / 16)));

      if (ray.hitType === 'isosceles') {
        const apexFactor = ray.apexProximity || 0;
        const r = Math.round(135 + apexFactor * 65);
        const g = Math.round(25 - apexFactor * 10);
        const b = Math.round(25 - apexFactor * 10);
        const alpha = Math.min(0.95, intensity * (0.65 + apexFactor * 0.45));
        subjCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
      } else {
        const alpha = Math.min(0.85, intensity * 0.75);
        subjCtx.fillStyle = `rgba(32, 28, 22, ${alpha})`;
        subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
      }
    }
  }

  subjCtx.strokeStyle = '#8c6d3b';
  subjCtx.lineWidth = 1.2;
  subjCtx.strokeRect(0, slotTop, w, slotHeight);

  subjCtx.fillStyle = 'rgba(212, 175, 55, 0.6)';
  subjCtx.fillRect(w / 2 - 0.5, slotTop, 1, slotHeight);

  subjCtx.fillStyle = '#0f172a';
  subjCtx.fillRect(0, h - hudHeight, w, hudHeight);

  subjCtx.fillStyle = '#d4af37';
  subjCtx.font = 'bold 11px serif';
  subjCtx.textAlign = 'center';
  subjCtx.fillText('【正方形平直前沿视界 · 方位 0°】', w / 2, h - 14);

  subjCtx.font = '10px serif';
  subjCtx.textAlign = 'left';
  subjCtx.fillText('■ 左直角 90°', 12, h - 14);
  subjCtx.textAlign = 'right';
  subjCtx.fillText('右直角 90° ■', w - 12, h - 14);
}

// =========================================================================
// 第二幕渲染：议会大清洗（戒严五边形街区 + 针形刺客 + 圆形大祭司 + 高维飞升）
// =========================================================================
function renderPurgeOmniView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 25;
  const scale = 14.8;

  // 1. 古典羊皮纸底色
  omniCtx.fillStyle = '#f8f4e8';
  omniCtx.fillRect(0, 0, w, h);

  // 2. 议会戒严街区外墙 [-5.8, 5.8] 与 [-3.4, 3.4]
  const wallCorners = [
    { x: -5.8, y: -3.4 },
    { x: -5.8, y: 3.4 },
    { x: 5.8, y: 3.4 },
    { x: 5.8, y: -3.4 },
  ];
  const screenCorners = wallCorners.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  // 街区地砖细密网格
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.12)';
  omniCtx.lineWidth = 1;
  for (let x = -5.0; x <= 5.0; x += 1.6) {
    const p1 = project3DtoIso({ x, y: -3.4, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 3.4, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -3.0; y <= 3.0; y += 1.5) {
    const p1 = project3DtoIso({ x: -5.8, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 5.8, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // 绘制议会街区厚重外沿围墙
  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 3.2;
  omniCtx.beginPath();
  omniCtx.moveTo(screenCorners[0].x, screenCorners[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(screenCorners[i].x, screenCorners[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  omniCtx.strokeStyle = 'rgba(200, 150, 62, 0.65)';
  omniCtx.lineWidth = 1.2;
  omniCtx.stroke();

  // 3. 高维引渡法阵（终点虚空法阵，位于 5.6, 0）
  const portalPt = project3DtoIso({ x: purgeGame.voidPortal.x, y: purgeGame.voidPortal.y, z: 0 }, scale);
  const px = cx + portalPt.screenX;
  const py = cy + portalPt.screenY;
  const time = Date.now() / 400;

  // 虚空星环底纹
  const portalGlow = 14 + Math.sin(time * 3) * 3;
  omniCtx.fillStyle = 'rgba(96, 165, 250, 0.22)';
  omniCtx.beginPath();
  omniCtx.arc(px, py, portalGlow, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.strokeStyle = '#3b82f6';
  omniCtx.lineWidth = 2.0;
  omniCtx.beginPath();
  omniCtx.arc(px, py, 11, 0, Math.PI * 2);
  omniCtx.stroke();

  omniCtx.strokeStyle = '#93c5fd';
  omniCtx.lineWidth = 1.2;
  omniCtx.beginPath();
  omniCtx.arc(px, py, 6, 0, Math.PI * 2);
  omniCtx.stroke();

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#2563eb';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【引渡法阵】', px, py - 18);

  // 4. 圆形大祭司（坐镇中庭 0, 0）
  const priestPt = project3DtoIso({ x: purgeGame.circlePriest.x, y: purgeGame.circlePriest.y, z: 0 }, scale);
  const prX = cx + priestPt.screenX;
  const prY = cy + priestPt.screenY;

  // 圣光光环扩散波纹
  const auraR = (purgeGame.circlePriest.auraRadius * scale) + Math.sin(time * 2.5) * 4;
  const auraGrad = omniCtx.createRadialGradient(prX, prY, 4, prX, prY, auraR);
  auraGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
  auraGrad.addColorStop(0.6, 'rgba(234, 179, 8, 0.18)');
  auraGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
  omniCtx.fillStyle = auraGrad;
  omniCtx.beginPath();
  omniCtx.arc(prX, prY, auraR, 0, Math.PI * 2);
  omniCtx.fill();

  // 大祭司圆形尊躯
  const priestR = purgeGame.circlePriest.radius * scale;
  const priestGrad = omniCtx.createRadialGradient(prX - 3, prY - 3, 2, prX, prY, priestR);
  priestGrad.addColorStop(0, '#ffffff');
  priestGrad.addColorStop(0.35, '#fef08a');
  priestGrad.addColorStop(0.85, '#ca8a04');
  priestGrad.addColorStop(1, '#78350f');

  omniCtx.fillStyle = priestGrad;
  omniCtx.beginPath();
  omniCtx.arc(prX, prY, priestR, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.strokeStyle = '#854d0e';
  omniCtx.lineWidth = 2.0;
  omniCtx.stroke();

  // 祭司同心金冠纹
  omniCtx.strokeStyle = '#fef9c3';
  omniCtx.lineWidth = 1.2;
  omniCtx.beginPath();
  omniCtx.arc(prX, prY, priestR * 0.55, 0, Math.PI * 2);
  omniCtx.stroke();

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = '#854d0e';
  omniCtx.textAlign = 'left';
  omniCtx.fillText('【圆形大祭司】', prX + priestR + 8, prY + 3);

  // 5. 针形刺客（女性公民：致命锋利线段，纵向往复巡弋）
  for (const a of purgeGame.needleAssassins) {
    const halfLen = a.length / 2;
    const p1 = project3DtoIso({ x: a.x, y: a.y - halfLen, z: 0 }, scale);
    const p2 = project3DtoIso({ x: a.x, y: a.y + halfLen, z: 0 }, scale);
    const ax1 = cx + p1.screenX;
    const ay1 = cy + p1.screenY;
    const ax2 = cx + p2.screenX;
    const ay2 = cy + p2.screenY;
    const midX = (ax1 + ax2) / 2;
    const midY = (ay1 + ay2) / 2;

    // 高速穿刺红色警示辉光
    omniCtx.strokeStyle = 'rgba(225, 29, 72, 0.35)';
    omniCtx.lineWidth = 9;
    omniCtx.lineCap = 'round';
    omniCtx.beginPath();
    omniCtx.moveTo(ax1, ay1);
    omniCtx.lineTo(ax2, ay2);
    omniCtx.stroke();

    // 细针核心
    omniCtx.strokeStyle = '#be123c';
    omniCtx.lineWidth = 3.6;
    omniCtx.beginPath();
    omniCtx.moveTo(ax1, ay1);
    omniCtx.lineTo(ax2, ay2);
    omniCtx.stroke();

    omniCtx.strokeStyle = '#ffffff';
    omniCtx.lineWidth = 1.4;
    omniCtx.beginPath();
    omniCtx.moveTo(ax1, ay1);
    omniCtx.lineTo(ax2, ay2);
    omniCtx.stroke();

    // 极锐两端针尖
    for (const pt of [{ x: ax1, y: ay1 }, { x: ax2, y: ay2 }]) {
      omniCtx.fillStyle = '#ffffff';
      omniCtx.strokeStyle = '#e11d48';
      omniCtx.lineWidth = 1.2;
      omniCtx.beginPath();
      omniCtx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      omniCtx.fill();
      omniCtx.stroke();
    }

    omniCtx.font = 'bold 9px serif';
    omniCtx.fillStyle = '#9f1239';
    omniCtx.textAlign = 'center';
    const labelOffsetY = a.x < 0 ? 16 : -14;
    omniCtx.fillText('【针形刺客】', midX, midY + labelOffsetY);
  }

  // 6. 高维接引符印（3 枚金菱星印）
  for (const t of purgeGame.tokens) {
    if (t.collected) continue;
    const p = project3DtoIso({ x: t.x, y: t.y, z: 0 }, scale);
    const fx = cx + p.screenX;
    const fy = cy + p.screenY;

    omniCtx.fillStyle = 'rgba(212, 175, 55, 0.28)';
    omniCtx.beginPath();
    omniCtx.arc(fx, fy, 10, 0, Math.PI * 2);
    omniCtx.fill();

    omniCtx.fillStyle = '#fef08a';
    omniCtx.strokeStyle = '#b38022';
    omniCtx.lineWidth = 1.5;
    omniCtx.beginPath();
    omniCtx.moveTo(fx, fy - 7);
    omniCtx.lineTo(fx + 5, fy);
    omniCtx.lineTo(fx, fy + 7);
    omniCtx.lineTo(fx - 5, fy);
    omniCtx.closePath();
    omniCtx.fill();
    omniCtx.stroke();
  }

  // 7. 正方形绅士：四等边四直角 + 视锥 / 飞升投影
  const curZ = purgeGame.currentZ;
  const isAsc = purgeGame.isAscended;

  // 若已飞升，绘制地面投影虚影与引力金线
  if (isAsc && curZ > 0.1) {
    const gVerts = getSquareVertices(
      { x: purgeGame.player.x, y: purgeGame.player.y },
      purgeGame.player.size,
      purgeGame.player.angle
    );
    const gScrVerts = gVerts.map(pt => {
      const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
      return { x: cx + p.screenX, y: cy + p.screenY };
    });

    // 地面暗影
    omniCtx.fillStyle = 'rgba(80, 60, 40, 0.2)';
    omniCtx.beginPath();
    omniCtx.moveTo(gScrVerts[0].x, gScrVerts[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(gScrVerts[i].x, gScrVerts[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    // 4 根垂直升维接引光柱
    const skyVerts = gVerts.map(pt => {
      const p = project3DtoIso({ x: pt.x, y: pt.y, z: curZ }, scale);
      return { x: cx + p.screenX, y: cy + p.screenY };
    });

    omniCtx.setLineDash([2, 3]);
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
    omniCtx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      omniCtx.beginPath();
      omniCtx.moveTo(gScrVerts[i].x, gScrVerts[i].y);
      omniCtx.lineTo(skyVerts[i].x, skyVerts[i].y);
      omniCtx.stroke();
    }
    omniCtx.setLineDash([]);
  }

  // 视锥（仅在未飞升时显示地面扇形）
  const playerScreenPt = project3DtoIso({ x: purgeGame.player.x, y: purgeGame.player.y, z: curZ }, scale);
  const pxNow = cx + playerScreenPt.screenX;
  const pyNow = cy + playerScreenPt.screenY;

  if (!isAsc) {
    const halfFov = Math.PI / 6;
    const coneDist = 3.6;
    const coneP1 = project3DtoIso({
      x: purgeGame.player.x + Math.cos(purgeGame.player.angle - halfFov) * coneDist,
      y: purgeGame.player.y + Math.sin(purgeGame.player.angle - halfFov) * coneDist,
      z: 0,
    }, scale);
    const coneMid = project3DtoIso({
      x: purgeGame.player.x + Math.cos(purgeGame.player.angle) * coneDist * 1.08,
      y: purgeGame.player.y + Math.sin(purgeGame.player.angle) * coneDist * 1.08,
      z: 0,
    }, scale);
    const coneP2 = project3DtoIso({
      x: purgeGame.player.x + Math.cos(purgeGame.player.angle + halfFov) * coneDist,
      y: purgeGame.player.y + Math.sin(purgeGame.player.angle + halfFov) * coneDist,
      z: 0,
    }, scale);

    const coneGrad = omniCtx.createRadialGradient(pxNow, pyNow, 4, pxNow, pyNow, 60);
    coneGrad.addColorStop(0, 'rgba(212, 175, 55, 0.28)');
    coneGrad.addColorStop(0.7, 'rgba(212, 175, 55, 0.12)');
    coneGrad.addColorStop(1, 'rgba(212, 175, 55, 0.0)');

    omniCtx.fillStyle = coneGrad;
    omniCtx.beginPath();
    omniCtx.moveTo(pxNow, pyNow);
    omniCtx.lineTo(cx + coneP1.screenX, cy + coneP1.screenY);
    omniCtx.quadraticCurveTo(cx + coneMid.screenX, cy + coneMid.screenY, cx + coneP2.screenX, cy + coneP2.screenY);
    omniCtx.closePath();
    omniCtx.fill();
  }

  // 正方形多边形
  const pVerts = getSquareVertices(
    { x: purgeGame.player.x, y: purgeGame.player.y },
    purgeGame.player.size,
    purgeGame.player.angle
  );
  const pScrVerts = pVerts.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: curZ }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  if (isAsc) {
    omniCtx.fillStyle = '#ffffff';
    omniCtx.strokeStyle = '#facc15';
    omniCtx.lineWidth = 2.4;
  } else {
    omniCtx.fillStyle = '#fcfbf7';
    omniCtx.strokeStyle = '#b38022';
    omniCtx.lineWidth = 1.8;
  }

  omniCtx.beginPath();
  omniCtx.moveTo(pScrVerts[0].x, pScrVerts[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(pScrVerts[i].x, pScrVerts[i].y);
  omniCtx.closePath();
  omniCtx.fill();
  omniCtx.stroke();

  // 中心金色方印
  const inVerts = getSquareVertices(
    { x: purgeGame.player.x, y: purgeGame.player.y },
    purgeGame.player.size * 0.45,
    purgeGame.player.angle
  );
  const inScrVerts = inVerts.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: curZ }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });
  omniCtx.strokeStyle = isAsc ? '#eab308' : '#d4af37';
  omniCtx.lineWidth = 1.2;
  omniCtx.beginPath();
  omniCtx.moveTo(inScrVerts[0].x, inScrVerts[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(inScrVerts[i].x, inScrVerts[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  omniCtx.font = 'bold 10px serif';
  omniCtx.fillStyle = isAsc ? '#b45309' : '#3e2c14';
  omniCtx.textAlign = 'left';
  if (isAsc) {
    omniCtx.fillText('我（高维飞升）', pxNow + 16, pyNow + 3);
  } else {
    omniCtx.fillText('我（正方形绅士）', pxNow + 16, pyNow + 3);
  }
}

// =========================================================================
// 第二幕第一人称渲染：迷雾中刺客细针闪光与大祭司圣光
// =========================================================================
function renderPurgeSubjView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  subjCtx.fillStyle = '#1c1813';
  subjCtx.fillRect(0, 0, w, h);

  const hudHeight = 36;
  const horizonY = (h - hudHeight) / 2;
  const slotHeight = 13;
  const slotTop = horizonY - slotHeight / 2;

  // 视网膜迷雾基底
  subjCtx.fillStyle = '#c5b89c';
  subjCtx.fillRect(0, slotTop, w, slotHeight);

  if (purgeGame.isAscended) {
    // 飞升状态：脱离二维迷雾，整条视网膜沐浴在璀璨的高维晨曦中
    const ascGrad = subjCtx.createLinearGradient(0, slotTop, w, slotTop);
    ascGrad.addColorStop(0, 'rgba(147, 197, 253, 0.7)');
    ascGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.9)');
    ascGrad.addColorStop(1, 'rgba(147, 197, 253, 0.7)');
    subjCtx.fillStyle = ascGrad;
    subjCtx.fillRect(0, slotTop, w, slotHeight);
  } else {
    // 平面受限状态：180 束射线投射
    const rayCount = 180;
    const rawRays = purgeGame.castRays(rayCount);
    const colWidth = w / rayCount;

    for (let i = 0; i < rayCount; i++) {
      const ray = rawRays[i];
      if (ray.distance < Infinity) {
        const x = i * colWidth;
        const intensity = Math.max(0.12, Math.min(1.0, 1.0 - (ray.distance / 16)));

        if (ray.hitType === 'priest') {
          // 圆形大祭司：宽阔温润的纯金圣光
          const alpha = Math.min(0.95, intensity * 0.9);
          const pGrad = subjCtx.createLinearGradient(0, slotTop, 0, slotTop + slotHeight);
          pGrad.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
          pGrad.addColorStop(0.5, `rgba(234, 179, 8, ${alpha})`);
          pGrad.addColorStop(1, `rgba(180, 83, 9, ${alpha * 0.8})`);
          subjCtx.fillStyle = pGrad;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        } else if (ray.hitType === 'needle') {
          // 针形刺客：近乎无形的细针在迷雾中巡弋，针尖爆出耀眼白芒
          const tip = ray.tipFactor || 0;
          if (tip > 0.65) {
            subjCtx.fillStyle = '#ffffff';
            subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
          } else {
            const alpha = Math.min(0.85, intensity * 0.7);
            subjCtx.fillStyle = `rgba(225, 29, 72, ${alpha})`;
            subjCtx.fillRect(x, slotTop + 2, Math.ceil(colWidth), slotHeight - 4);
          }
        } else if (ray.hitType === 'portal') {
          // 高维引渡法阵：深邃空灵的虚空蓝芒
          const alpha = Math.min(0.9, intensity * 0.85);
          subjCtx.fillStyle = `rgba(96, 165, 250, ${alpha})`;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        } else {
          // 街区墙体
          const alpha = Math.min(0.85, intensity * 0.75);
          subjCtx.fillStyle = `rgba(32, 28, 22, ${alpha})`;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        }
      }
    }
  }

  // 视网膜青铜边框
  subjCtx.strokeStyle = '#8c6d3b';
  subjCtx.lineWidth = 1.2;
  subjCtx.strokeRect(0, slotTop, w, slotHeight);

  // 准星
  subjCtx.fillStyle = 'rgba(212, 175, 55, 0.6)';
  subjCtx.fillRect(w / 2 - 0.5, slotTop, 1, slotHeight);

  // 底部 HUD 状态
  subjCtx.fillStyle = '#0f172a';
  subjCtx.fillRect(0, h - hudHeight, w, hudHeight);

  subjCtx.fillStyle = '#d4af37';
  subjCtx.font = 'bold 11px serif';
  subjCtx.textAlign = 'center';

  if (purgeGame.isAscended) {
    subjCtx.fillText('【高维超脱视界】已凌驾平面议会之上 · 俯瞰凡俗街区与刺客', w / 2, h - 14);
  } else {
    subjCtx.fillText('【正方形平直前沿视界 · 方位 0°】迷雾中隐针闪烁', w / 2, h - 14);
  }

  subjCtx.font = '10px serif';
  subjCtx.textAlign = 'left';
  subjCtx.fillText('■ 左直角 90°', 12, h - 14);
  subjCtx.textAlign = 'right';
  subjCtx.fillText('右直角 90° ■', w - 12, h - 14);
}

requestAnimationFrame(gameLoop);
