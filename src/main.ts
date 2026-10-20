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
(window as any).coordinator = coordinator;
const lineland = coordinator.lineland;
const escapeGame = coordinator.escape;
const spacelandGame = coordinator.spaceland;

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
    // 第二幕：空间国与内脏全知
    if (spacelandGame.phase === 'CROSS_SECTION') {
      const ok = spacelandGame.interactWithSphere();
      if (ok) {
        dialogueStrip.textContent = spacelandGame.soliloquy;
      } else {
        const r = spacelandGame.sphereCrossSectionRadius;
        if (r <= 0.5) {
          dialogueStrip.textContent = '“【截面未现】球体正浮动于纸面之外！请观察其上下穿透，待金色截面膨胀显现！”';
        } else {
          dialogueStrip.textContent = '“【距离过远】请靠近正在地平面膨胀的金色圆截面，按空格或点击按钮触碰交互！”';
        }
      }
    } else if (spacelandGame.phase === 'CABINET_PUZZLE') {
      if (!spacelandGame.hasRetrievedManuscript) {
        const ok = spacelandGame.reachIntoCabinet();
        if (ok) {
          dialogueStrip.textContent = spacelandGame.soliloquy;
        } else {
          dialogueStrip.textContent = '“【密室死锁】请走到书房中央的反锁密闭铁箱旁，唤醒高维之手越顶取物！”';
        }
      } else {
        const ok = spacelandGame.triggerAscend();
        if (ok) {
          dialogueStrip.textContent = spacelandGame.soliloquy;
        }
      }
    } else if (spacelandGame.phase === 'ASCENDED') {
      if (spacelandGame.altitude >= 3.5) {
        spacelandGame.completeEnlightenment();
      } else {
        dialogueStrip.textContent = '“【攀升中】视界正向更高维度展开，请等待高度稳定俯瞰全境！”';
      }
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
    dialogueStrip.textContent = spacelandGame.soliloquy;
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
    // 第二幕：空间国与内脏全知（球体截面穿透、反锁密室、空间国飞升）
    // -------------------------------------------------------------
    if (currentModalMode === 'NONE') {
      spacelandGame.movePlayer(forward, turn, dt);
    }

    spacelandGame.update(dt);

    // 动态水银管与操作按钮：反映高维截面变化或飞升海拔
    if (spacelandGame.phase === 'CROSS_SECTION') {
      gaugeLabel.textContent = '截面:';
      const ratio = spacelandGame.sphereCrossSectionRadius / spacelandGame.sphere.radius3D;
      mercuryBar.style.width = `${Math.round(ratio * 100)}%`;

      const dist = Math.hypot(spacelandGame.player.x - spacelandGame.sphere.x, spacelandGame.player.y - spacelandGame.sphere.y);
      const isNear = dist < spacelandGame.sphereCrossSectionRadius + 1.4 && spacelandGame.sphereCrossSectionRadius > 0.5;

      if (isNear) {
        btnAscend.classList.remove('btn-sealed');
        btnAscend.classList.add('charged');
        btnAscendText.textContent = '触碰高维圆';
        btnAscendSub.textContent = `(截面 r: ${spacelandGame.sphereCrossSectionRadius.toFixed(2)})`;
      } else {
        btnAscend.classList.add('btn-sealed');
        btnAscend.classList.remove('charged');
        btnAscendText.textContent = '静观截面中';
        btnAscendSub.textContent = `(圆半径: ${spacelandGame.sphereCrossSectionRadius.toFixed(2)})`;
      }
    } else if (spacelandGame.phase === 'CABINET_PUZZLE') {
      if (!spacelandGame.hasRetrievedManuscript) {
        gaugeLabel.textContent = '密室:';
        mercuryBar.style.width = '50%';
        const distCab = Math.hypot(spacelandGame.player.x - spacelandGame.cabinet.x, spacelandGame.player.y - spacelandGame.cabinet.y);
        if (distCab < 2.2) {
          btnAscend.classList.remove('btn-sealed');
          btnAscend.classList.add('charged');
          btnAscendText.textContent = '探入反锁密室';
          btnAscendSub.textContent = '(从上方越顶取物)';
        } else {
          btnAscend.classList.add('btn-sealed');
          btnAscend.classList.remove('charged');
          btnAscendText.textContent = '靠近反锁铁箱';
          btnAscendSub.textContent = '(二维四壁阻隔)';
        }
      } else {
        gaugeLabel.textContent = '飞升:';
        mercuryBar.style.width = '100%';
        btnAscend.classList.remove('btn-sealed');
        btnAscend.classList.add('charged');
        btnAscendText.textContent = '飞升空间国';
        btnAscendSub.textContent = '(拔出纸面 · 俯瞰全知)';
      }
    } else {
      // ASCENDED
      gaugeLabel.textContent = '海拔:';
      mercuryBar.style.width = `${Math.round((spacelandGame.altitude / 5.0) * 100)}%`;
      if (spacelandGame.altitude >= 3.5) {
        btnAscend.classList.remove('btn-sealed');
        btnAscend.classList.add('charged');
        btnAscendText.textContent = '顿悟三维全知';
        btnAscendSub.textContent = '(内脏与全景一览无余)';
      } else {
        btnAscend.classList.add('btn-sealed');
        btnAscend.classList.remove('charged');
        btnAscendText.textContent = '空间国攀升中';
        btnAscendSub.textContent = `(高度: ${spacelandGame.altitude.toFixed(1)} / 5.0)`;
      }
    }

    if (spacelandGame.gameState === 'VICTORY' && !modalOverlay.classList.contains('active')) {
      currentModalMode = 'VICTORY';
      modalOverlay.classList.add('active');
      const ms = coordinator.completionManuscript;
      modalTitle.textContent = ms.title;
      modalBody.textContent = ms.body;
      btnModalAction.textContent = ms.nextBtnText;
    }

    const juiceFrame = spacelandGame.juice.update(dt);
    subjViewport.style.transform = `translate(${juiceFrame.offsetX}px, ${juiceFrame.offsetY}px)`;

    renderSpacelandOmniView();
    renderSpacelandSubjView();
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
// 第二幕渲染：空间国与内脏全知（反锁书房 + 球体三维穿透 + 密室取物 + 空间国俯瞰）
// =========================================================================
function renderSpacelandOmniView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 25;
  const scale = 15.5;

  // 1. 古典羊皮纸底色
  omniCtx.fillStyle = '#f8f4e8';
  omniCtx.fillRect(0, 0, w, h);

  const walls = spacelandGame.studyWalls;
  const isAsc = spacelandGame.isAscended;
  const alt = spacelandGame.altitude;

  // 2. 街道与室外同胞（用于展示飞升后的【内脏透视】）
  // 室外路人：等边三角形贵族位于 (0, 4.4)，等腰宪兵位于 (-5.4, 0)
  const citizens = [
    { type: 'triangle', x: 0, y: 4.4, size: 1.4 },
    { type: 'isosceles', x: -5.4, y: 0, size: 1.2 },
  ];

  for (const c of citizens) {
    const cp = project3DtoIso({ x: c.x, y: c.y, z: 0 }, scale);
    const scrX = cx + cp.screenX;
    const scrY = cy + cp.screenY;

    if (!isAsc) {
      // 二维未升维时：只能看到模糊的外框轮廓
      omniCtx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      omniCtx.lineWidth = 1.2;
      omniCtx.beginPath();
      omniCtx.arc(scrX, scrY, 8, 0, Math.PI * 2);
      omniCtx.stroke();
    } else {
      // 升维三维俯瞰时：【透视内脏神迹】——看到同胞从未示人的五脏六腑！
      // 外框半透明
      omniCtx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      omniCtx.lineWidth = 1.2;
      omniCtx.beginPath();
      omniCtx.arc(scrX, scrY, 11, 0, Math.PI * 2);
      omniCtx.stroke();

      // 内部跳动的心脏 (深红宝石菱形)
      const heartPulse = 1.0 + Math.sin(Date.now() / 200) * 0.25;
      omniCtx.fillStyle = '#e11d48';
      omniCtx.beginPath();
      omniCtx.moveTo(scrX, scrY - 4 * heartPulse);
      omniCtx.lineTo(scrX + 3 * heartPulse, scrY);
      omniCtx.lineTo(scrX, scrY + 4 * heartPulse);
      omniCtx.lineTo(scrX - 3 * heartPulse, scrY);
      omniCtx.closePath();
      omniCtx.fill();

      // 内部几何消化脏器
      omniCtx.strokeStyle = '#d97706';
      omniCtx.lineWidth = 1.2;
      omniCtx.strokeRect(scrX - 5, scrY - 5, 10, 10);

      omniCtx.font = 'bold 9px serif';
      omniCtx.fillStyle = '#991b1b';
      omniCtx.textAlign = 'center';
      omniCtx.fillText('同胞内部(脏器)', scrX, scrY - 14);
    }
  }

  // 3. 书房地砖网格
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.12)';
  omniCtx.lineWidth = 1;
  for (let x = walls.minX; x <= walls.maxX; x += 1.5) {
    const p1 = project3DtoIso({ x, y: walls.minY, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: walls.maxY, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = walls.minY; y <= walls.maxY; y += 1.4) {
    const p1 = project3DtoIso({ x: walls.minX, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: walls.maxX, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // 4. 反锁书房外墙四壁
  const roomCorners = [
    { x: walls.minX, y: walls.minY },
    { x: walls.minX, y: walls.maxY },
    { x: walls.maxX, y: walls.maxY },
    { x: walls.maxX, y: walls.minY },
  ];
  const scrCorners = roomCorners.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 3.2;
  omniCtx.beginPath();
  omniCtx.moveTo(scrCorners[0].x, scrCorners[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(scrCorners[i].x, scrCorners[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  omniCtx.strokeStyle = 'rgba(200, 150, 62, 0.65)';
  omniCtx.lineWidth = 1.2;
  omniCtx.stroke();

  // 5. 书房中央的反锁密室铁箱
  const cab = spacelandGame.cabinet;
  const hs = cab.halfSize;
  const cabCorners = [
    { x: cab.x - hs, y: cab.y - hs },
    { x: cab.x - hs, y: cab.y + hs },
    { x: cab.x + hs, y: cab.y + hs },
    { x: cab.x + hs, y: cab.y - hs },
  ];
  const scrCab = cabCorners.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });
  const cabCenterP = project3DtoIso({ x: cab.x, y: cab.y, z: 0 }, scale);
  const cabCx = cx + cabCenterP.screenX;
  const cabCy = cy + cabCenterP.screenY;

  if (!spacelandGame.hasRetrievedManuscript && alt < 0.5) {
    // 二维视角：完全封闭、不可穿透的反锁铁箱
    omniCtx.fillStyle = '#334155';
    omniCtx.beginPath();
    omniCtx.moveTo(scrCab[0].x, scrCab[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(scrCab[i].x, scrCab[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    omniCtx.strokeStyle = '#0f172a';
    omniCtx.lineWidth = 2.0;
    omniCtx.stroke();

    // 挂锁标识
    omniCtx.fillStyle = '#f59e0b';
    omniCtx.beginPath();
    omniCtx.arc(cabCx, cabCy, 4, 0, Math.PI * 2);
    omniCtx.fill();

    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#475569';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('【反锁铁箱】', cabCx, cabCy - 16);
  } else {
    // 领悟高维或升维视角：【箱子没有盖子，内部一览无余】！
    omniCtx.fillStyle = 'rgba(254, 240, 138, 0.35)';
    omniCtx.beginPath();
    omniCtx.moveTo(scrCab[0].x, scrCab[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(scrCab[i].x, scrCab[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    omniCtx.strokeStyle = '#d97706';
    omniCtx.lineWidth = 1.8;
    omniCtx.stroke();

    // 内部绝密手稿金辉
    omniCtx.fillStyle = '#fde047';
    omniCtx.strokeStyle = '#b45309';
    omniCtx.lineWidth = 1.4;
    omniCtx.beginPath();
    omniCtx.rect(cabCx - 6, cabCy - 4, 12, 8);
    omniCtx.fill();
    omniCtx.stroke();

    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#b45309';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('【密室内部·手稿】', cabCx, cabCy - 16);
  }

  // 6. 三维球体导师（截面与三维实体演示）
  const sp = spacelandGame.sphere;
  const spCenterPt = project3DtoIso({ x: sp.x, y: sp.y, z: 0 }, scale);
  const spCx = cx + spCenterPt.screenX;
  const spCy = cy + spCenterPt.screenY;
  const rCross = spacelandGame.sphereCrossSectionRadius;

  // A. 二维地平面上的动态圆截面 (如果当前穿透平面)
  if (rCross > 0.05) {
    const discPts: { x: number; y: number }[] = [];
    for (let a = 0; a <= Math.PI * 2; a += Math.PI / 16) {
      const p = project3DtoIso({
        x: sp.x + Math.cos(a) * rCross,
        y: sp.y + Math.sin(a) * rCross,
        z: 0,
      }, scale);
      discPts.push({ x: cx + p.screenX, y: cy + p.screenY });
    }

    const grad = omniCtx.createRadialGradient(spCx, spCy, 2, spCx, spCy, rCross * scale);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#fef08a');
    grad.addColorStop(0.75, '#ca8a04');
    grad.addColorStop(1, '#854d0e');

    omniCtx.fillStyle = grad;
    omniCtx.beginPath();
    omniCtx.moveTo(discPts[0].x, discPts[0].y);
    for (let i = 1; i < discPts.length; i++) omniCtx.lineTo(discPts[i].x, discPts[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    omniCtx.strokeStyle = '#78350f';
    omniCtx.lineWidth = 1.8;
    omniCtx.stroke();

    // 截面脉动光环
    omniCtx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
    omniCtx.lineWidth = 1.2;
    omniCtx.beginPath();
    for (let i = 0; i < discPts.length; i++) {
      const pt = discPts[i];
      if (i === 0) omniCtx.moveTo(pt.x, pt.y);
      else omniCtx.lineTo(pt.x, pt.y);
    }
    omniCtx.stroke();

    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#854d0e';
    omniCtx.textAlign = 'center';
    omniCtx.fillText(`【截面 r: ${rCross.toFixed(1)}】`, spCx, spCy + rCross * scale + 13);
  } else {
    // 球体脱离二维地平面时：显示虚线穿梭原点
    omniCtx.setLineDash([3, 3]);
    omniCtx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    omniCtx.lineWidth = 1.2;
    omniCtx.beginPath();
    omniCtx.arc(spCx, spCy, 6, 0, Math.PI * 2);
    omniCtx.stroke();
    omniCtx.setLineDash([]);

    omniCtx.font = '10px serif';
    omniCtx.fillStyle = '#b45309';
    omniCtx.textAlign = 'center';
    omniCtx.fillText('【穿离纸面】', spCx, spCy + 14);
  }

  // B. 绘制球体在三维高度 Z 处的浮动球体轮廓与高度引导虚线
  const sphere3DPt = project3DtoIso({ x: sp.x, y: sp.y, z: sp.z }, scale);
  const sp3Dx = cx + sphere3DPt.screenX;
  const sp3Dy = cy + sphere3DPt.screenY;

  // 垂直连接光轴
  omniCtx.setLineDash([2, 3]);
  omniCtx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
  omniCtx.lineWidth = 1.2;
  omniCtx.beginPath();
  omniCtx.moveTo(spCx, spCy);
  omniCtx.lineTo(sp3Dx, sp3Dy);
  omniCtx.stroke();
  omniCtx.setLineDash([]);

  // 三维球体晶球
  const sphereR = sp.radius3D * scale * 0.75;
  const sGrad = omniCtx.createRadialGradient(sp3Dx - sphereR * 0.35, sp3Dy - sphereR * 0.35, 3, sp3Dx, sp3Dy, sphereR);
  sGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  sGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.6)');
  sGrad.addColorStop(0.9, 'rgba(202, 138, 4, 0.4)');
  sGrad.addColorStop(1, 'rgba(120, 53, 15, 0.15)');

  omniCtx.fillStyle = sGrad;
  omniCtx.beginPath();
  omniCtx.arc(sp3Dx, sp3Dy, sphereR, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
  omniCtx.lineWidth = 1.4;
  omniCtx.stroke();

  omniCtx.font = 'bold 9px serif';
  omniCtx.fillStyle = '#b45309';
  omniCtx.textAlign = 'right';
  const zSign = sp.z >= 0 ? '+' : '';
  omniCtx.fillText(`三维球体(Z: ${zSign}${sp.z.toFixed(1)})`, sp3Dx - sphereR - 4, sp3Dy + 3);

  // 7. 正方形绅士：四等边四直角 + 视锥 / 空间国飞升投影
  const curZ = spacelandGame.altitude;

  if (isAsc && curZ > 0.1) {
    // 地面暗影
    const gVerts = getSquareVertices(
      { x: spacelandGame.player.x, y: spacelandGame.player.y },
      spacelandGame.player.size,
      spacelandGame.player.angle
    );
    const gScrVerts = gVerts.map(pt => {
      const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
      return { x: cx + p.screenX, y: cy + p.screenY };
    });

    omniCtx.fillStyle = 'rgba(80, 60, 40, 0.22)';
    omniCtx.beginPath();
    omniCtx.moveTo(gScrVerts[0].x, gScrVerts[0].y);
    for (let i = 1; i < 4; i++) omniCtx.lineTo(gScrVerts[i].x, gScrVerts[i].y);
    omniCtx.closePath();
    omniCtx.fill();

    // 4 根垂直升维光柱
    const skyVerts = gVerts.map(pt => {
      const p = project3DtoIso({ x: pt.x, y: pt.y, z: curZ }, scale);
      return { x: cx + p.screenX, y: cy + p.screenY };
    });

    omniCtx.setLineDash([2, 3]);
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    omniCtx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      omniCtx.beginPath();
      omniCtx.moveTo(gScrVerts[i].x, gScrVerts[i].y);
      omniCtx.lineTo(skyVerts[i].x, skyVerts[i].y);
      omniCtx.stroke();
    }
    omniCtx.setLineDash([]);
  }

  // 视锥（仅在二维时显示地面扇形）
  const playerScreenPt = project3DtoIso({ x: spacelandGame.player.x, y: spacelandGame.player.y, z: curZ }, scale);
  const pxNow = cx + playerScreenPt.screenX;
  const pyNow = cy + playerScreenPt.screenY;

  if (!isAsc) {
    const halfFov = Math.PI / 6;
    const coneDist = 3.6;
    const coneP1 = project3DtoIso({
      x: spacelandGame.player.x + Math.cos(spacelandGame.player.angle - halfFov) * coneDist,
      y: spacelandGame.player.y + Math.sin(spacelandGame.player.angle - halfFov) * coneDist,
      z: 0,
    }, scale);
    const coneMid = project3DtoIso({
      x: spacelandGame.player.x + Math.cos(spacelandGame.player.angle) * coneDist * 1.08,
      y: spacelandGame.player.y + Math.sin(spacelandGame.player.angle) * coneDist * 1.08,
      z: 0,
    }, scale);
    const coneP2 = project3DtoIso({
      x: spacelandGame.player.x + Math.cos(spacelandGame.player.angle + halfFov) * coneDist,
      y: spacelandGame.player.y + Math.sin(spacelandGame.player.angle + halfFov) * coneDist,
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
    { x: spacelandGame.player.x, y: spacelandGame.player.y },
    spacelandGame.player.size,
    spacelandGame.player.angle
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
    { x: spacelandGame.player.x, y: spacelandGame.player.y },
    spacelandGame.player.size * 0.45,
    spacelandGame.player.angle
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
    omniCtx.fillText('我（空间国全知）', pxNow + 16, pyNow + 3);
  } else {
    omniCtx.fillText('我（正方形绅士）', pxNow + 16, pyNow + 3);
  }
}

// =========================================================================
// 第二幕第一人称渲染：截面脉动变化与三维全透视破茧展开
// =========================================================================
function renderSpacelandSubjView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  subjCtx.fillStyle = '#1c1813';
  subjCtx.fillRect(0, 0, w, h);

  const hudHeight = 36;
  const horizonY = (h - hudHeight) / 2;
  const isAsc = spacelandGame.isAscended;
  const alt = spacelandGame.altitude;

  if (isAsc && alt > 0.3) {
    // -------------------------------------------------------------
    // 【三维全知破茧视界】：从一维细线彻底展开为真实的二维俯瞰画卷！
    // -------------------------------------------------------------
    const expandHeight = Math.min(h - hudHeight - 16, 13 + (alt / 5.0) * 175);
    const slotTop = horizonY - expandHeight / 2;

    // 浩瀚空间国天界晨曦渐变
    const skyGrad = subjCtx.createLinearGradient(0, slotTop, 0, slotTop + expandHeight);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.3, '#1e1b4b');
    skyGrad.addColorStop(0.7, '#d97706');
    skyGrad.addColorStop(1, '#fef08a');
    subjCtx.fillStyle = skyGrad;
    subjCtx.fillRect(16, slotTop, w - 32, expandHeight);

    // 展开视窗青铜流金装裱边框
    subjCtx.strokeStyle = '#d4af37';
    subjCtx.lineWidth = 2.0;
    subjCtx.strokeRect(16, slotTop, w - 32, expandHeight);

    // 空间国三维俯瞰画卷文字
    subjCtx.font = 'bold 12px serif';
    subjCtx.fillStyle = '#fef08a';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('【空间国俯瞰 · 内部一览无余】', w / 2, slotTop + 24);

    subjCtx.font = '11px serif';
    subjCtx.fillStyle = '#ffffff';
    subjCtx.fillText('“书房的屋顶消失了，密闭铁箱里的手稿与同胞的五脏六腑尽收眼底！”', w / 2, slotTop + 48);
    subjCtx.fillText(`当前俯瞰拔升高度: ${alt.toFixed(1)} / 5.0 空间坐标单位`, w / 2, slotTop + 72);

  } else {
    // -------------------------------------------------------------
    // 二维受限状态：13px 纤薄视网膜槽中的球体截面脉动
    // -------------------------------------------------------------
    const slotHeight = 13;
    const slotTop = horizonY - slotHeight / 2;

    subjCtx.fillStyle = '#c5b89c';
    subjCtx.fillRect(0, slotTop, w, slotHeight);

    const rayCount = 180;
    const rawRays = spacelandGame.castRays(rayCount);
    const colWidth = w / rayCount;

    for (let i = 0; i < rayCount; i++) {
      const ray = rawRays[i];
      if (ray.distance < Infinity) {
        const x = i * colWidth;
        const intensity = Math.max(0.12, Math.min(1.0, 1.0 - (ray.distance / 16)));

        if (ray.hitType === 'sphere') {
          // 球体截面：根据球体在平面上的截面大小，在视网膜上产生动态宽度的神圣金光！
          const alpha = Math.min(0.95, intensity * 0.95);
          const pGrad = subjCtx.createLinearGradient(0, slotTop, 0, slotTop + slotHeight);
          pGrad.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
          pGrad.addColorStop(0.5, `rgba(234, 179, 8, ${alpha})`);
          pGrad.addColorStop(1, `rgba(180, 83, 9, ${alpha * 0.8})`);
          subjCtx.fillStyle = pGrad;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        } else if (ray.hitType === 'cabinet') {
          // 中央反锁密闭铁箱：沉郁冷冽的青黛色死锁光斑
          const alpha = Math.min(0.85, intensity * 0.8);
          subjCtx.fillStyle = `rgba(51, 65, 85, ${alpha})`;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        } else {
          // 书房外墙
          const alpha = Math.min(0.85, intensity * 0.75);
          subjCtx.fillStyle = `rgba(32, 28, 22, ${alpha})`;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        }
      }
    }

    // 视网膜青铜边框与准星
    subjCtx.strokeStyle = '#8c6d3b';
    subjCtx.lineWidth = 1.2;
    subjCtx.strokeRect(0, slotTop, w, slotHeight);

    subjCtx.fillStyle = 'rgba(212, 175, 55, 0.6)';
    subjCtx.fillRect(w / 2 - 0.5, slotTop, 1, slotHeight);
  }

  // 底部 HUD 状态与文学指引
  subjCtx.fillStyle = '#0f172a';
  subjCtx.fillRect(0, h - hudHeight, w, hudHeight);

  subjCtx.fillStyle = '#d4af37';
  subjCtx.font = 'bold 11px serif';
  subjCtx.textAlign = 'center';

  if (isAsc && alt > 0.5) {
    subjCtx.fillText('【三维全知视界】密室与同胞内脏同时呈现', w / 2, h - 14);
  } else if (spacelandGame.phase === 'CROSS_SECTION') {
    const r = spacelandGame.sphereCrossSectionRadius.toFixed(1);
    subjCtx.fillText(`【反锁书房视界】球体截面脉动 (圆: ${r})`, w / 2, h - 14);
  } else {
    subjCtx.fillText('【反锁书房视界】密室四壁死锁 · 探寻高维方向', w / 2, h - 14);
  }

  subjCtx.font = '10px serif';
  subjCtx.textAlign = 'left';
  subjCtx.fillText('■ 左直角 90°', 12, h - 14);
  subjCtx.textAlign = 'right';
  subjCtx.fillText('右直角 90° ■', w - 12, h - 14);
}

requestAnimationFrame(gameLoop);
