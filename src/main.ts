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

const altitudeDock = document.getElementById('altitude-dock') as HTMLElement;
const altitudeTitle = document.getElementById('altitude-title') as HTMLElement;
const btnElevUp = document.getElementById('btn-elev-up') as HTMLElement;
const btnElevDown = document.getElementById('btn-elev-down') as HTMLElement;

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
  if (e.key === 'q' || e.key === 'Q') {
    if (coordinator.currentLevelId === GameLevelId.SPACELAND_COUP && spacelandGame.isAscended) {
      spacelandGame.changeAltitude(-0.35);
    }
  }
  if (e.key === 'e' || e.key === 'E') {
    if (coordinator.currentLevelId === GameLevelId.SPACELAND_COUP && spacelandGame.isAscended) {
      spacelandGame.changeAltitude(0.35);
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

const gameFrame = document.getElementById('game-frame')!;
gameFrame.addEventListener('wheel', (e) => {
  if (coordinator.currentLevelId === GameLevelId.SPACELAND_COUP && spacelandGame.isAscended) {
    if (e.deltaY < 0) {
      spacelandGame.changeAltitude(0.4);
    } else {
      spacelandGame.changeAltitude(-0.4);
    }
    e.preventDefault();
  }
}, { passive: false });

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
if (btnElevUp) setupButton(btnElevUp, 'e');
if (btnElevDown) setupButton(btnElevDown, 'q');

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
  updateTabButtonsUI();
}

const tabAct0 = document.getElementById('tab-act-0') as HTMLButtonElement | null;
const tabAct1 = document.getElementById('tab-act-1') as HTMLButtonElement | null;
const tabAct2 = document.getElementById('tab-act-2') as HTMLButtonElement | null;

function updateTabButtonsUI(): void {
  const current = coordinator.currentLevelId;
  if (tabAct0) {
    if (current === GameLevelId.LINELAND_PROLOGUE) tabAct0.classList.add('active');
    else tabAct0.classList.remove('active');
  }
  if (tabAct1) {
    if (current === GameLevelId.FLATLAND_ESCAPE) tabAct1.classList.add('active');
    else tabAct1.classList.remove('active');
  }
  if (tabAct2) {
    if (current === GameLevelId.SPACELAND_PURGE) tabAct2.classList.add('active');
    else tabAct2.classList.remove('active');
  }
}

function selectLevel(id: GameLevelId): void {
  coordinator.switchLevel(id);
  resetCurrentLevel();
  showIntroManuscript();
  updateTabButtonsUI();
}

if (tabAct0) tabAct0.addEventListener('click', () => selectLevel(GameLevelId.LINELAND_PROLOGUE));
if (tabAct1) tabAct1.addEventListener('click', () => selectLevel(GameLevelId.FLATLAND_ESCAPE));
if (tabAct2) tabAct2.addEventListener('click', () => selectLevel(GameLevelId.SPACELAND_PURGE));

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
    updateTabButtonsUI();
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
  updateTabButtonsUI();
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
      // 操控按键：A/D 控制视角左右旋转环视，W/S 控制沿当前视角前进后退！
      spacelandGame.movePlayer(forward, turn, dt);
      if (spacelandGame.isAscended) {
        // 高程升降控制：E/Space 升高，Q/Shift 俯冲
        if (keys['q'] || keys['shift']) spacelandGame.changeAltitude(-3.8 * dt);
        if (keys['e'] || keys[' ']) spacelandGame.changeAltitude(3.8 * dt);
      }
    }

    spacelandGame.update(dt);

    if (spacelandGame.isAscended) {
      if (altitudeDock) {
        altitudeDock.style.display = 'flex';
        altitudeTitle.textContent = `高程 Z: ${spacelandGame.altitude.toFixed(1)}`;
      }
    } else {
      if (altitudeDock) {
        altitudeDock.style.display = 'none';
      }
    }

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
      mercuryBar.style.width = `${Math.min(100, Math.round((spacelandGame.altitude / 8.0) * 100))}%`;
      if (spacelandGame.altitude >= 3.5) {
        btnAscend.classList.remove('btn-sealed');
        btnAscend.classList.add('charged');
        btnAscendText.textContent = '顿悟三维全知';
        btnAscendSub.textContent = `(俯瞰全景 Z: ${spacelandGame.altitude.toFixed(1)})`;
      } else {
        btnAscend.classList.add('btn-sealed');
        btnAscend.classList.remove('charged');
        btnAscendText.textContent = '空间国攀升中';
        btnAscendSub.textContent = `(高度: ${spacelandGame.altitude.toFixed(1)} / 12.0)`;
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
// 三维向下第一人称俯视投影变换算法 (3D Downward Perspective Projection)
// =========================================================================
interface Projected3DPoint {
  x: number;
  y: number;
  scale: number;
  depth: number;
  visible: boolean;
}

function project3DDownward(
  wx: number,
  wy: number,
  wz: number,
  camX: number,
  camY: number,
  camZ: number,
  camAngle: number = 0,
  canvasW: number = 440,
  canvasH: number = 300
): Projected3DPoint {
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  // 严格的垂直向下第一人称俯视投影 (Downward Top-Down Perspective)
  // 相机悬浮于高空 (camX, camY, camZ)，垂直朝下俯瞰 Z=0 二维大地
  const effZ = Math.max(0.35, camZ - wz);

  // 动态焦距与广角拉伸：
  // 低空 (Z=0.6~1.5)：极大特写聚焦书房与手稿 (scale 约 110~150)
  // 高空 (Z=10~16)：平滑扩展视野范围至 70+ 世界单位，将整个大都市城邦尽收眼底！
  const zFactor = effZ > 3.0 ? 1.0 + (effZ - 3.0) * 0.18 : 1.0;
  const focal = 100;
  const scale = focal / (effZ * zFactor);

  const dx = wx - camX;
  const dy = wy - camY;

  // 根据相机的偏航朝向角 (Yaw = camAngle) 旋转视野，支持按 A/D 键自由左右转头环视！
  const cosA = Math.cos(camAngle);
  const sinA = Math.sin(camAngle);
  const rx = dx * cosA - dy * sinA;
  const ry = dx * sinA + dy * cosA;

  // 屏幕映射：向视线前方 (ry > 0) 对应向上，向视线右方 (rx > 0) 对应向右
  const sx = cx + rx * scale;
  const sy = cy - ry * scale;

  const margin = 280;
  const visible = sx >= -margin && sx <= canvasW + margin && sy >= -margin && sy <= canvasH + margin;

  return { x: sx, y: sy, scale, depth: effZ, visible };
}

// =========================================================================
// 第二幕全知沙盘渲染：飞升后升华为【三维第一人称俯瞰相机】
// =========================================================================
function renderSpacelandOmniView(): void {
  const w = omniCanvas.width;
  const h = omniCanvas.height;
  omniCtx.clearRect(0, 0, w, h);

  const isAsc = spacelandGame.isAscended;
  const alt = spacelandGame.altitude;

  if (isAsc && alt > 0.05) {
    // =============================================================
    // 【三维第一人称向下俯视相机】（悬浮于高空亲自低头俯视纯二维大地！）
    // =============================================================
    const camX = spacelandGame.player.x;
    const camY = spacelandGame.player.y;
    const camZ = alt;
    const camAngle = spacelandGame.player.angle;

    // 1. 浩瀚三维以太深邃渐变背景
    const skyGrad = omniCtx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, Math.max(w, h));
    skyGrad.addColorStop(0, '#1c150c');
    skyGrad.addColorStop(0.55, '#120d08');
    skyGrad.addColorStop(1, '#080604');
    omniCtx.fillStyle = skyGrad;
    omniCtx.fillRect(0, 0, w, h);

    // 2. 随视角旋转的以太经纬坐标刻度网格 (Z = 0)
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.10)';
    omniCtx.lineWidth = 0.8;
    for (let gx = -28; gx <= 28; gx += 4.0) {
      const p1 = project3DDownward(gx, -28, 0, camX, camY, camZ, camAngle, w, h);
      const p2 = project3DDownward(gx, 28, 0, camX, camY, camZ, camAngle, w, h);
      if (p1.visible || p2.visible) {
        omniCtx.beginPath();
        omniCtx.moveTo(p1.x, p1.y);
        omniCtx.lineTo(p2.x, p2.y);
        omniCtx.stroke();
      }
    }
    for (let gy = -28; gy <= 28; gy += 4.0) {
      const p1 = project3DDownward(-28, gy, 0, camX, camY, camZ, camAngle, w, h);
      const p2 = project3DDownward(28, gy, 0, camX, camY, camZ, camAngle, w, h);
      if (p1.visible || p2.visible) {
        omniCtx.beginPath();
        omniCtx.moveTo(p1.x, p1.y);
        omniCtx.lineTo(p2.x, p2.y);
        omniCtx.stroke();
      }
    }

    // =============================================================
    // 3. 【平面国大都市全貌 (Metropolis of Flatland)】（严格纯二维平面！）
    // =============================================================

    // (A) 外围环城八边形双层城墙与城门 (R = 25.0)
    const wallR = 25.0;
    const gateSegments = 8;
    omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    omniCtx.lineWidth = Math.max(1.2, Math.min(3.0, 16.0 / alt));
    omniCtx.beginPath();
    for (let i = 0; i <= gateSegments; i++) {
      const a = (i * 2 * Math.PI) / gateSegments + Math.PI / 8;
      const wx = Math.cos(a) * wallR;
      const wy = Math.sin(a) * wallR;
      const pt = project3DDownward(wx, wy, 0, camX, camY, camZ, camAngle, w, h);
      if (i === 0) omniCtx.moveTo(pt.x, pt.y);
      else omniCtx.lineTo(pt.x, pt.y);
    }
    omniCtx.stroke();

    // 外城墙内环双线
    omniCtx.strokeStyle = 'rgba(180, 130, 40, 0.25)';
    omniCtx.lineWidth = 1.0;
    omniCtx.beginPath();
    for (let i = 0; i <= gateSegments; i++) {
      const a = (i * 2 * Math.PI) / gateSegments + Math.PI / 8;
      const wx = Math.cos(a) * (wallR - 0.8);
      const wy = Math.sin(a) * (wallR - 0.8);
      const pt = project3DDownward(wx, wy, 0, camX, camY, camZ, camAngle, w, h);
      if (i === 0) omniCtx.moveTo(pt.x, pt.y);
      else omniCtx.lineTo(pt.x, pt.y);
    }
    omniCtx.stroke();

    // (B) 城市严整纵横路网（双线石板路，无任何遮挡文字）
    const cityRoads = [
      // 中央南北大道
      { x1: 0, y1: -24, x2: 0, y2: 24 },
      // 中央东西大街
      { x1: -24, y1: 0, x2: 24, y2: 0 },
      // 维多利亚北街与南林荫道
      { x1: -22, y1: 5.5, x2: 22, y2: 5.5 },
      { x1: -22, y1: -5.5, x2: 22, y2: -5.5 },
      // 西宪兵巡道与东门商道
      { x1: -6.5, y1: -22, x2: -6.5, y2: 22 },
      { x1: 6.5, y1: -22, x2: 6.5, y2: 22 },
      // 远方副干道
      { x1: -15, y1: -20, x2: -15, y2: 20 },
      { x1: 15, y1: -20, x2: 15, y2: 20 },
      { x1: -20, y1: 14, x2: 20, y2: 14 },
      { x1: -20, y1: -14, x2: 20, y2: -14 },
    ];
    omniCtx.strokeStyle = 'rgba(217, 119, 6, 0.24)';
    omniCtx.lineWidth = Math.max(1.2, Math.min(3.5, 14.0 / alt));
    for (const r of cityRoads) {
      const p1 = project3DDownward(r.x1, r.y1, 0, camX, camY, camZ, camAngle, w, h);
      const p2 = project3DDownward(r.x2, r.y2, 0, camX, camY, camZ, camAngle, w, h);
      if (p1.visible || p2.visible) {
        omniCtx.beginPath();
        omniCtx.moveTo(p1.x, p1.y);
        omniCtx.lineTo(p2.x, p2.y);
        omniCtx.stroke();
      }
    }

    // (C) 街道暖黄煤气路灯光晕（柔和烘托维多利亚夜晚）
    const lamps = [
      { x: -5.0, y: 5.0 }, { x: 5.0, y: 5.0 },
      { x: -5.0, y: -5.0 }, { x: 5.0, y: -5.0 },
      { x: 0, y: 12.0 }, { x: 0, y: -12.0 },
      { x: -14.0, y: 0 }, { x: 14.0, y: 0 },
    ];
    for (const lp of lamps) {
      const lPt = project3DDownward(lp.x, lp.y, 0, camX, camY, camZ, camAngle, w, h);
      if (lPt.visible) {
        const radius = Math.max(6, Math.min(36, 95 / alt));
        const lGrad = omniCtx.createRadialGradient(lPt.x, lPt.y, 1, lPt.x, lPt.y, radius);
        lGrad.addColorStop(0, 'rgba(254, 240, 138, 0.40)');
        lGrad.addColorStop(0.45, 'rgba(217, 119, 6, 0.14)');
        lGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
        omniCtx.fillStyle = lGrad;
        omniCtx.beginPath();
        omniCtx.arc(lPt.x, lPt.y, radius, 0, Math.PI * 2);
        omniCtx.fill();
      }
    }

    // (D) 北方统治阶级【圆形大议会广场 (High Council of Circles)】（严格平面同心圆）
    const councilPt = project3DDownward(0, 11.5, 0, camX, camY, camZ, camAngle, w, h);
    if (councilPt.visible) {
      const cRadius = 4.2 * councilPt.scale;
      omniCtx.fillStyle = 'rgba(254, 240, 138, 0.12)';
      omniCtx.beginPath();
      omniCtx.arc(councilPt.x, councilPt.y, cRadius, 0, Math.PI * 2);
      omniCtx.fill();

      omniCtx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
      omniCtx.lineWidth = Math.max(1.5, Math.min(3.5, 12 / alt));
      omniCtx.stroke();

      // 内环议事厅
      omniCtx.beginPath();
      omniCtx.arc(councilPt.x, councilPt.y, cRadius * 0.55, 0, Math.PI * 2);
      omniCtx.stroke();
    }

    // (E) 西方等腰宪兵营地与大校场（严格平面长方形与巡道）
    const garrisonPts = [
      project3DDownward(-15.5, -6.5, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(-15.5, 6.5, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(-8.5, 6.5, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(-8.5, -6.5, 0, camX, camY, camZ, camAngle, w, h),
    ];
    if (garrisonPts.some(p => p.visible)) {
      omniCtx.fillStyle = 'rgba(71, 85, 105, 0.20)';
      omniCtx.beginPath();
      omniCtx.moveTo(garrisonPts[0].x, garrisonPts[0].y);
      for (let i = 1; i < 4; i++) omniCtx.lineTo(garrisonPts[i].x, garrisonPts[i].y);
      omniCtx.closePath();
      omniCtx.fill();

      omniCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      omniCtx.lineWidth = 1.2;
      omniCtx.stroke();
    }

    // (F) 东方等边工匠商贩区（密集严整的三角形平面街区）
    const guildPts = [
      project3DDownward(8.5, -6.5, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(8.5, 6.5, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(15.5, 6.5, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(15.5, -6.5, 0, camX, camY, camZ, camAngle, w, h),
    ];
    if (guildPts.some(p => p.visible)) {
      omniCtx.fillStyle = 'rgba(180, 83, 9, 0.16)';
      omniCtx.beginPath();
      omniCtx.moveTo(guildPts[0].x, guildPts[0].y);
      for (let i = 1; i < 4; i++) omniCtx.lineTo(guildPts[i].x, guildPts[i].y);
      omniCtx.closePath();
      omniCtx.fill();

      omniCtx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
      omniCtx.lineWidth = 1.2;
      omniCtx.stroke();
    }

    // (G) 东北与西北贵族多边形庭院建筑群（严格平面多边形宅邸）
    const patricianMansions = [
      { x: -11.5, y: 11.5, r: 2.8, sides: 5 },
      { x: 11.5, y: 11.5, r: 2.8, sides: 6 },
      { x: -11.5, y: -11.5, r: 2.6, sides: 5 },
      { x: 11.5, y: -11.5, r: 2.6, sides: 6 },
    ];
    for (const pm of patricianMansions) {
      const pmPt = project3DDownward(pm.x, pm.y, 0, camX, camY, camZ, camAngle, w, h);
      if (pmPt.visible) {
        omniCtx.fillStyle = 'rgba(212, 175, 55, 0.16)';
        omniCtx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
        omniCtx.lineWidth = 1.2;
        omniCtx.beginPath();
        for (let s = 0; s < pm.sides; s++) {
          const ang = (s * 2 * Math.PI) / pm.sides - Math.PI / 2;
          const px = pmPt.x + Math.cos(ang) * pm.r * pmPt.scale;
          const py = pmPt.y + Math.sin(ang) * pm.r * pmPt.scale;
          if (s === 0) omniCtx.moveTo(px, py);
          else omniCtx.lineTo(px, py);
        }
        omniCtx.closePath();
        omniCtx.fill();
        omniCtx.stroke();
      }
    }

    // =============================================================
    // 4. 【主角正方形书房】（严格纯平面！无任何长方体凹槽与假立体拉伸）
    // =============================================================
    const walls = spacelandGame.studyWalls;
    const roomFloorPts = [
      project3DDownward(walls.minX, walls.minY, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(walls.minX, walls.maxY, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(walls.maxX, walls.maxY, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(walls.maxX, walls.minY, 0, camX, camY, camZ, camAngle, w, h),
    ];

    if (roomFloorPts.some(p => p.visible)) {
      // 书房纯平面木地板
      omniCtx.fillStyle = 'rgba(245, 235, 215, 0.52)';
      omniCtx.beginPath();
      omniCtx.moveTo(roomFloorPts[0].x, roomFloorPts[0].y);
      for (let i = 1; i < 4; i++) omniCtx.lineTo(roomFloorPts[i].x, roomFloorPts[i].y);
      omniCtx.closePath();
      omniCtx.fill();

      // 平面人字木纹（严格在地面 Z=0）
      omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.20)';
      omniCtx.lineWidth = 1.0;
      for (let x = walls.minX; x <= walls.maxX; x += 1.2) {
        const p1 = project3DDownward(x, walls.minY, 0, camX, camY, camZ, camAngle, w, h);
        const p2 = project3DDownward(x, walls.maxY, 0, camX, camY, camZ, camAngle, w, h);
        if (p1.visible && p2.visible) {
          omniCtx.beginPath();
          omniCtx.moveTo(p1.x, p1.y);
          omniCtx.lineTo(p2.x, p2.y);
          omniCtx.stroke();
        }
      }

      // 平面国双线平面墙壁（厚度为零，只有平面线宽）
      omniCtx.strokeStyle = '#d4af37';
      omniCtx.lineWidth = Math.max(1.8, Math.min(4.5, 18.0 / alt));
      omniCtx.beginPath();
      omniCtx.moveTo(roomFloorPts[0].x, roomFloorPts[0].y);
      for (let i = 1; i < 4; i++) omniCtx.lineTo(roomFloorPts[i].x, roomFloorPts[i].y);
      omniCtx.closePath();
      omniCtx.stroke();

      // 内侧辅助线条
      omniCtx.strokeStyle = 'rgba(180, 130, 40, 0.45)';
      omniCtx.lineWidth = 1.0;
      omniCtx.stroke();

      // 平面书桌与地毯（严格平面图形）
      const deskP = project3DDownward(-1.5, 1.2, 0, camX, camY, camZ, camAngle, w, h);
      if (deskP.visible) {
        const dw = Math.max(8, Math.min(50, 60 / alt));
        const dh = dw * 0.6;
        omniCtx.fillStyle = '#451a03';
        omniCtx.fillRect(deskP.x - dw / 2, deskP.y - dh / 2, dw, dh);
      }
    }

    // =============================================================
    // 5. 【反锁密闭铁箱】（严格纯平面二维矩形！绝无长方体立体侧壁）
    // =============================================================
    const cab = spacelandGame.cabinet;
    const hs = cab.halfSize;
    const cabPts = [
      project3DDownward(cab.x - hs, cab.y - hs, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(cab.x - hs, cab.y + hs, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(cab.x + hs, cab.y + hs, 0, camX, camY, camZ, camAngle, w, h),
      project3DDownward(cab.x + hs, cab.y - hs, 0, camX, camY, camZ, camAngle, w, h),
    ];

    if (cabPts.some(p => p.visible)) {
      // 铁箱内部底色（敞开露出的金黄手稿微光）
      omniCtx.fillStyle = 'rgba(254, 240, 138, 0.42)';
      omniCtx.beginPath();
      omniCtx.moveTo(cabPts[0].x, cabPts[0].y);
      for (let i = 1; i < 4; i++) omniCtx.lineTo(cabPts[i].x, cabPts[i].y);
      omniCtx.closePath();
      omniCtx.fill();

      // 铁箱严格闭合二维边框（双线生铁质感，四边封闭）
      omniCtx.strokeStyle = '#f59e0b';
      omniCtx.lineWidth = Math.max(1.8, Math.min(4.5, 18.0 / alt));
      omniCtx.stroke();

      // 箱内羊皮纸绝密手稿卷轴（平躺在矩形中央，无多余标签，克制典雅）
      const cabCenter = project3DDownward(cab.x, cab.y, 0, camX, camY, camZ, camAngle, w, h);
      if (cabCenter.visible) {
        const docW = Math.max(10, Math.min(65, 75 / alt));
        const docH = docW * 0.65;
        omniCtx.fillStyle = '#fef08a';
        omniCtx.strokeStyle = '#b45309';
        omniCtx.lineWidth = 1.2;
        omniCtx.fillRect(cabCenter.x - docW / 2, cabCenter.y - docH / 2, docW, docH);
        omniCtx.strokeRect(cabCenter.x - docW / 2, cabCenter.y - docH / 2, docW, docH);
      }
    }

    // =============================================================
    // 6. 【天界球体导师】（唯一的三维实体！悬浮于高空，投射地面阴影）
    // =============================================================
    const sp = spacelandGame.sphere;
    // (A) 在二维地面 (Z = 0) 投下的柔和漫反射椭圆阴影
    const shadowCenter = project3DDownward(sp.x, sp.y, 0, camX, camY, camZ, camAngle, w, h);
    if (shadowCenter.visible) {
      const shR = Math.max(8, Math.min(45, (sp.radius3D * 105) / alt));
      omniCtx.fillStyle = 'rgba(0, 0, 0, 0.40)';
      omniCtx.beginPath();
      omniCtx.ellipse(shadowCenter.x, shadowCenter.y, shR * 1.2, shR * 0.75, 0, 0, Math.PI * 2);
      omniCtx.fill();
    }

    // (B) 悬浮在三维空中的发光球体
    const spZ = sp.z + 1.2;
    const spPt = project3DDownward(sp.x, sp.y, spZ, camX, camY, camZ, camAngle, w, h);
    if (spPt.visible) {
      const spR = Math.max(12, Math.min(55, (sp.radius3D * 125) / spPt.depth));
      const sGrad = omniCtx.createRadialGradient(spPt.x - spR * 0.35, spPt.y - spR * 0.35, 2, spPt.x, spPt.y, spR);
      sGrad.addColorStop(0, '#ffffff');
      sGrad.addColorStop(0.3, '#fef08a');
      sGrad.addColorStop(0.8, '#d97706');
      sGrad.addColorStop(1, 'rgba(120, 53, 15, 0.28)');
      omniCtx.fillStyle = sGrad;
      omniCtx.beginPath();
      omniCtx.arc(spPt.x, spPt.y, spR, 0, Math.PI * 2);
      omniCtx.fill();

      omniCtx.strokeStyle = '#facc15';
      omniCtx.lineWidth = 1.8;
      omniCtx.stroke();

      omniCtx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      omniCtx.lineWidth = 1.2;
      omniCtx.beginPath();
      omniCtx.ellipse(spPt.x, spPt.y, spR * 1.4, spR * 0.45, Math.PI / 8, 0, Math.PI * 2);
      omniCtx.stroke();
    }

    // =============================================================
    // 7. 【漫步各阶层市民】（严格纯二维几何生命！彻底移除头顶文字标签）
    // =============================================================
    for (const c of spacelandGame.citizens) {
      const cp = project3DDownward(c.x, c.y, 0, camX, camY, camZ, camAngle, w, h);
      if (!cp.visible) continue;

      const scaleF = Math.max(5, Math.min(42, 60 / alt));

      // 半透明几何晶体外壳（根据相机朝向旋转渲染）
      omniCtx.save();
      omniCtx.translate(cp.x, cp.y);
      omniCtx.rotate(camAngle);

      omniCtx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
      omniCtx.fillStyle = 'rgba(255, 255, 255, 0.26)';
      omniCtx.lineWidth = 1.4;
      omniCtx.beginPath();
      if (c.type === 'triangle') {
        omniCtx.moveTo(0, -scaleF);
        omniCtx.lineTo(scaleF * 0.88, scaleF * 0.65);
        omniCtx.lineTo(-scaleF * 0.88, scaleF * 0.65);
        omniCtx.closePath();
      } else if (c.type === 'isosceles') {
        omniCtx.moveTo(0, -scaleF * 1.5);
        omniCtx.lineTo(scaleF * 0.42, scaleF * 0.65);
        omniCtx.lineTo(-scaleF * 0.42, scaleF * 0.65);
        omniCtx.closePath();
      } else if (c.type === 'pentagon') {
        for (let a = 0; a < 5; a++) {
          const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
          const px = Math.cos(ang) * scaleF * 0.95;
          const py = Math.sin(ang) * scaleF * 0.95;
          if (a === 0) omniCtx.moveTo(px, py);
          else omniCtx.lineTo(px, py);
        }
        omniCtx.closePath();
      } else if (c.type === 'hexagon') {
        for (let a = 0; a < 6; a++) {
          const ang = (a * 2 * Math.PI) / 6;
          const px = Math.cos(ang) * scaleF * 0.95;
          const py = Math.sin(ang) * scaleF * 0.95;
          if (a === 0) omniCtx.moveTo(px, py);
          else omniCtx.lineTo(px, py);
        }
        omniCtx.closePath();
      } else if (c.type === 'circle') {
        omniCtx.arc(0, 0, scaleF * 0.9, 0, Math.PI * 2);
      } else {
        omniCtx.rect(-scaleF * 0.75, -scaleF * 0.75, scaleF * 1.5, scaleF * 1.5);
      }
      omniCtx.fill();
      omniCtx.stroke();

      // 胸腔内部：跳动的红宝石心脏 (Ruby Core)
      const pulse = 1.0 + Math.sin(c.organPulsePhase) * 0.35;
      const heartSize = scaleF * 0.45 * pulse;

      // 心脏舒张微光光晕
      const hGrad = omniCtx.createRadialGradient(0, 0, 1, 0, 0, heartSize * 1.7);
      hGrad.addColorStop(0, '#f43f5e');
      hGrad.addColorStop(0.6, 'rgba(225, 29, 72, 0.45)');
      hGrad.addColorStop(1, 'rgba(225, 29, 72, 0)');
      omniCtx.fillStyle = hGrad;
      omniCtx.beginPath();
      omniCtx.arc(0, 0, heartSize * 1.7, 0, Math.PI * 2);
      omniCtx.fill();

      // 红宝石心脏实体
      omniCtx.fillStyle = '#e11d48';
      omniCtx.beginPath();
      omniCtx.moveTo(0, -heartSize);
      omniCtx.lineTo(heartSize * 0.75, 0);
      omniCtx.lineTo(0, heartSize);
      omniCtx.lineTo(-heartSize * 0.75, 0);
      omniCtx.closePath();
      omniCtx.fill();

      // 金色主动脉微管分支
      omniCtx.strokeStyle = '#d97706';
      omniCtx.lineWidth = 1.0;
      omniCtx.strokeRect(-heartSize * 0.6, -heartSize * 0.6, heartSize * 1.2, heartSize * 1.2);

      omniCtx.restore();
    }

    // 8. 正方形自身拔离纸面飞升动画（脱离印痕）
    if (spacelandGame.isDetaching) {
      const p = project3DDownward(camX, camY, 0, camX, camY, camZ, camAngle, w, h);
      omniCtx.strokeStyle = '#facc15';
      omniCtx.lineWidth = 2.0;
      omniCtx.strokeRect(p.x - 20, p.y - 20, 40, 40);

      const auraGrad = omniCtx.createRadialGradient(p.x, p.y, 8, p.x, p.y, 65);
      auraGrad.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
      auraGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      omniCtx.fillStyle = auraGrad;
      omniCtx.beginPath();
      omniCtx.arc(p.x, p.y, 65, 0, Math.PI * 2);
      omniCtx.fill();
    }

    // 9. 维多利亚古典机械高度计与朝向仪表盘（HUD）
    omniCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    omniCtx.strokeStyle = '#8c6d3b';
    omniCtx.lineWidth = 1.4;
    omniCtx.fillRect(6, 6, w - 12, 28);
    omniCtx.strokeRect(6, 6, w - 12, 28);

    const deg = Math.round(((camAngle * 180) / Math.PI) % 360 + 360) % 360;
    omniCtx.font = 'bold 10px serif';
    omniCtx.fillStyle = '#fef08a';
    omniCtx.textAlign = 'left';
    omniCtx.fillText(`【三维俯视】海拔 Z: ${alt.toFixed(1)} 英尺 | 视角朝向: ${deg}°`, 14, 23);

    omniCtx.textAlign = 'right';
    let viewHint = '【中空俯视】反锁密室 · 绝密手稿';
    if (alt > 6.0) viewHint = '【高空鸟瞰】维多利亚大都市全景';
    else if (alt <= 1.8) viewHint = '【近空特写】书房手稿 · 心脏微观';
    omniCtx.fillText(viewHint, w - 14, 23);

    return;
  }


  // 二维未升维状态：维多利亚古典宏观书房（规模宏大充盈，彻底告别抠抠搜搜）
  const cx = w / 2;
  const cy = h / 2 + 18;
  const scale = 25.5;

  omniCtx.fillStyle = '#f6f0df';
  omniCtx.fillRect(0, 0, w, h);

  const walls = spacelandGame.studyWalls;

  // 外部街道与建筑基底
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.12)';
  omniCtx.lineWidth = 1;
  for (let x = -8; x <= 8; x += 1.8) {
    const p1 = project3DtoIso({ x, y: -6.5, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: 6.5, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }
  for (let y = -6.5; y <= 6.5; y += 1.6) {
    const p1 = project3DtoIso({ x: -8, y, z: 0 }, scale);
    const p2 = project3DtoIso({ x: 8, y, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // 路名地标
  const northRoadP = project3DtoIso({ x: 0, y: 5.4, z: 0 }, scale);
  omniCtx.font = '9px serif';
  omniCtx.fillStyle = '#8c6d3b';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【维多利亚北街】', cx + northRoadP.screenX, cy + northRoadP.screenY);

  const westRoadP = project3DtoIso({ x: -6.2, y: 0, z: 0 }, scale);
  omniCtx.fillText('【西宪兵巡道】', cx + westRoadP.screenX, cy + westRoadP.screenY);

  // 煤气路灯
  const lampP = project3DtoIso({ x: -4.8, y: 3.8, z: 0 }, scale);
  const lampGrad = omniCtx.createRadialGradient(cx + lampP.screenX, cy + lampP.screenY, 2, cx + lampP.screenX, cy + lampP.screenY, 32);
  lampGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
  lampGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  omniCtx.fillStyle = lampGrad;
  omniCtx.beginPath();
  omniCtx.arc(cx + lampP.screenX, cy + lampP.screenY, 32, 0, Math.PI * 2);
  omniCtx.fill();

  // 室外路人轮廓
  for (const c of spacelandGame.citizens) {
    const cp = project3DtoIso({ x: c.x, y: c.y, z: 0 }, scale);
    const scrX = cx + cp.screenX;
    const scrY = cy + cp.screenY;
    omniCtx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    omniCtx.lineWidth = 1.4;
    omniCtx.beginPath();
    if (c.type === 'triangle') {
      omniCtx.moveTo(scrX, scrY - 7);
      omniCtx.lineTo(scrX + 7, scrY + 6);
      omniCtx.lineTo(scrX - 7, scrY + 6);
      omniCtx.closePath();
    } else if (c.type === 'isosceles') {
      omniCtx.moveTo(scrX, scrY - 11);
      omniCtx.lineTo(scrX + 3.5, scrY + 6);
      omniCtx.lineTo(scrX - 3.5, scrY + 6);
      omniCtx.closePath();
    } else {
      omniCtx.strokeRect(scrX - 6, scrY - 6, 12, 12);
    }
    omniCtx.stroke();
  }

  // 书房室内木地板
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

  omniCtx.fillStyle = 'rgba(235, 222, 195, 0.75)';
  omniCtx.beginPath();
  omniCtx.moveTo(scrCorners[0].x, scrCorners[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(scrCorners[i].x, scrCorners[i].y);
  omniCtx.closePath();
  omniCtx.fill();

  // 木纹线
  omniCtx.strokeStyle = 'rgba(140, 109, 59, 0.16)';
  omniCtx.lineWidth = 1;
  for (let x = walls.minX; x <= walls.maxX; x += 0.95) {
    const p1 = project3DtoIso({ x, y: walls.minY, z: 0 }, scale);
    const p2 = project3DtoIso({ x, y: walls.maxY, z: 0 }, scale);
    omniCtx.beginPath();
    omniCtx.moveTo(cx + p1.screenX, cy + p1.screenY);
    omniCtx.lineTo(cx + p2.screenX, cy + p2.screenY);
    omniCtx.stroke();
  }

  // 书桌与波斯地毯
  const rugP = project3DtoIso({ x: 0, y: 0, z: 0 }, scale);
  omniCtx.strokeStyle = 'rgba(139, 30, 30, 0.35)';
  omniCtx.lineWidth = 2.4;
  omniCtx.strokeRect(cx + rugP.screenX - 22, cy + rugP.screenY - 14, 44, 28);

  const deskP = project3DtoIso({ x: -1.4, y: 1.4, z: 0 }, scale);
  omniCtx.fillStyle = '#451a03';
  omniCtx.fillRect(cx + deskP.screenX - 12, cy + deskP.screenY - 6, 24, 12);
  omniCtx.fillStyle = '#fef08a';
  omniCtx.fillRect(cx + deskP.screenX - 6, cy + deskP.screenY - 4, 8, 6);

  // 书房厚重外墙
  omniCtx.strokeStyle = '#1a1611';
  omniCtx.lineWidth = 3.6;
  omniCtx.beginPath();
  omniCtx.moveTo(scrCorners[0].x, scrCorners[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(scrCorners[i].x, scrCorners[i].y);
  omniCtx.closePath();
  omniCtx.stroke();

  omniCtx.strokeStyle = 'rgba(200, 150, 62, 0.8)';
  omniCtx.lineWidth = 1.4;
  omniCtx.stroke();

  // 反锁铁箱
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

  omniCtx.fillStyle = '#1e293b';
  omniCtx.beginPath();
  omniCtx.moveTo(scrCab[0].x, scrCab[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(scrCab[i].x, scrCab[i].y);
  omniCtx.closePath();
  omniCtx.fill();

  omniCtx.strokeStyle = '#0f172a';
  omniCtx.lineWidth = 2.2;
  omniCtx.stroke();

  omniCtx.fillStyle = '#f59e0b';
  omniCtx.beginPath();
  omniCtx.arc(cabCx, cabCy, 4.5, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.font = 'bold 9.5px serif';
  omniCtx.fillStyle = '#334155';
  omniCtx.textAlign = 'center';
  omniCtx.fillText('【反锁铁箱 · 四壁闭合】', cabCx, cabCy - 15);

  // 三维球体穿透地平
  const sp = spacelandGame.sphere;
  const spCenterPt = project3DtoIso({ x: sp.x, y: sp.y, z: 0 }, scale);
  const spCx = cx + spCenterPt.screenX;
  const spCy = cy + spCenterPt.screenY;
  const rCross = spacelandGame.sphereCrossSectionRadius;

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
    omniCtx.lineWidth = 2.0;
    omniCtx.stroke();

    omniCtx.font = 'bold 9.5px serif';
    omniCtx.fillStyle = '#854d0e';
    omniCtx.textAlign = 'center';
    omniCtx.fillText(`【地平截面 r: ${rCross.toFixed(1)}】`, spCx, spCy + rCross * scale + 13);
  } else {
    omniCtx.setLineDash([3, 3]);
    omniCtx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    omniCtx.lineWidth = 1.2;
    omniCtx.beginPath();
    omniCtx.arc(spCx, spCy, 7, 0, Math.PI * 2);
    omniCtx.stroke();
    omniCtx.setLineDash([]);

    omniCtx.font = '9.5px serif';
    omniCtx.fillStyle = '#b45309';
    omniCtx.textAlign = 'center';
    omniCtx.fillText(`【离纸虚空 (Z:${sp.z.toFixed(1)})】`, spCx, spCy + 14);
  }

  // 三维球体轮廓与高度虚线
  const sphere3DPt = project3DtoIso({ x: sp.x, y: sp.y, z: sp.z }, scale);
  const sp3Dx = cx + sphere3DPt.screenX;
  const sp3Dy = cy + sphere3DPt.screenY;

  omniCtx.setLineDash([2, 3]);
  omniCtx.strokeStyle = 'rgba(234, 179, 8, 0.55)';
  omniCtx.lineWidth = 1.2;
  omniCtx.beginPath();
  omniCtx.moveTo(spCx, spCy);
  omniCtx.lineTo(sp3Dx, sp3Dy);
  omniCtx.stroke();
  omniCtx.setLineDash([]);

  const sphereR = sp.radius3D * scale * 0.72;
  const sGrad = omniCtx.createRadialGradient(sp3Dx - sphereR * 0.35, sp3Dy - sphereR * 0.35, 3, sp3Dx, sp3Dy, sphereR);
  sGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  sGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.7)');
  sGrad.addColorStop(0.85, 'rgba(202, 138, 4, 0.45)');
  sGrad.addColorStop(1, 'rgba(120, 53, 15, 0.2)');

  omniCtx.fillStyle = sGrad;
  omniCtx.beginPath();
  omniCtx.arc(sp3Dx, sp3Dy, sphereR, 0, Math.PI * 2);
  omniCtx.fill();

  omniCtx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
  omniCtx.lineWidth = 1.6;
  omniCtx.stroke();

  omniCtx.font = 'bold 9px serif';
  omniCtx.fillStyle = '#b45309';
  omniCtx.textAlign = 'right';
  const zSign = sp.z >= 0 ? '+' : '';
  omniCtx.fillText(`三维球体(Z: ${zSign}${sp.z.toFixed(1)})`, sp3Dx - sphereR - 4, sp3Dy + 3);

  // 正方形绅士
  const playerScreenPt = project3DtoIso({ x: spacelandGame.player.x, y: spacelandGame.player.y, z: 0 }, scale);
  const pxNow = cx + playerScreenPt.screenX;
  const pyNow = cy + playerScreenPt.screenY;

  const pVerts = getSquareVertices(
    { x: spacelandGame.player.x, y: spacelandGame.player.y },
    spacelandGame.player.size,
    spacelandGame.player.angle
  );
  const pScrVerts = pVerts.map(pt => {
    const p = project3DtoIso({ x: pt.x, y: pt.y, z: 0 }, scale);
    return { x: cx + p.screenX, y: cy + p.screenY };
  });

  omniCtx.fillStyle = '#fcfbf7';
  omniCtx.strokeStyle = '#b38022';
  omniCtx.lineWidth = 2.0;
  omniCtx.beginPath();
  omniCtx.moveTo(pScrVerts[0].x, pScrVerts[0].y);
  for (let i = 1; i < 4; i++) omniCtx.lineTo(pScrVerts[i].x, pScrVerts[i].y);
  omniCtx.closePath();
  omniCtx.fill();
  omniCtx.stroke();

  omniCtx.font = 'bold 9.5px serif';
  omniCtx.fillStyle = '#3e2c14';
  omniCtx.textAlign = 'left';
  omniCtx.fillText('我（正方形绅士）', pxNow + 16, pyNow + 3);
}

// =========================================================================
// 第二幕感官视界：飞升后升华为【高维内脏全知与真理图谱】
// =========================================================================
function renderSpacelandSubjView(): void {
  const w = subjCanvas.width;
  const h = subjCanvas.height;
  subjCtx.clearRect(0, 0, w, h);

  const hudHeight = 36;
  const isAsc = spacelandGame.isAscended;
  const alt = spacelandGame.altitude;

  if (isAsc && alt > 0.05) {
    // =============================================================
    // 【高维内脏全知与真理图谱】（展示同胞胸腔内心脏与消化脏器解剖图）
    // =============================================================
    subjCtx.fillStyle = '#181410';
    subjCtx.fillRect(0, 0, w, h);

    // 古典铜版画装饰边框
    subjCtx.strokeStyle = '#8c6d3b';
    subjCtx.lineWidth = 1.4;
    subjCtx.strokeRect(6, 6, w - 12, h - hudHeight - 12);

    subjCtx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    subjCtx.lineWidth = 1.0;
    subjCtx.strokeRect(9, 9, w - 18, h - hudHeight - 18);

    // 标题横幅
    subjCtx.fillStyle = '#231d17';
    subjCtx.fillRect(10, 10, w - 20, 26);
    subjCtx.font = 'bold 11px serif';
    subjCtx.fillStyle = '#fef08a';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('【高维感官觉醒 · 同胞内脏全知图谱】', w / 2, 27);

    // 三位同胞的内部器官解剖并列排布
    const citizenCards = [
      { name: '等边三角形贵族', pulse: 1.0 + Math.sin(Date.now() / 190) * 0.35, bpm: '72 BPM', role: '心室收缩舒张' },
      { name: '等腰三角形宪兵', pulse: 1.0 + Math.sin(Date.now() / 150) * 0.4, bpm: '90 BPM', role: '凶锐刺骨内腔' },
      { name: '正方形学者同僚', pulse: 1.0 + Math.sin(Date.now() / 220) * 0.3, bpm: '65 BPM', role: '四腔内壁循环' },
    ];

    const cardW = (w - 40) / 3;
    citizenCards.forEach((c, idx) => {
      const cx = 20 + idx * cardW + cardW / 2;
      const cy = 82;

      // 外廓半透明几何框
      subjCtx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
      subjCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      subjCtx.lineWidth = 1.2;
      subjCtx.beginPath();
      if (idx === 0) {
        subjCtx.moveTo(cx, cy - 22);
        subjCtx.lineTo(cx + 20, cy + 18);
        subjCtx.lineTo(cx - 20, cy + 18);
        subjCtx.closePath();
      } else if (idx === 1) {
        subjCtx.moveTo(cx, cy - 28);
        subjCtx.lineTo(cx + 12, cy + 18);
        subjCtx.lineTo(cx - 12, cy + 18);
        subjCtx.closePath();
      } else {
        subjCtx.rect(cx - 18, cy - 18, 36, 36);
      }
      subjCtx.fill();
      subjCtx.stroke();

      // 内部跳动的红宝石心脏
      const hSize = 8 * c.pulse;
      subjCtx.fillStyle = '#e11d48';
      subjCtx.beginPath();
      subjCtx.moveTo(cx, cy - hSize);
      subjCtx.lineTo(cx + hSize * 0.8, cy);
      subjCtx.lineTo(cx, cy + hSize);
      subjCtx.lineTo(cx - hSize * 0.8, cy);
      subjCtx.closePath();
      subjCtx.fill();

      // 消化血管纹路
      subjCtx.strokeStyle = '#d97706';
      subjCtx.lineWidth = 1.0;
      subjCtx.strokeRect(cx - 5, cy - 5, 10, 10);

      // 名称与心率
      subjCtx.font = 'bold 9px serif';
      subjCtx.fillStyle = '#fef08a';
      subjCtx.textAlign = 'center';
      subjCtx.fillText(c.name, cx, cy + 34);

      subjCtx.font = '8px serif';
      subjCtx.fillStyle = '#f87171';
      subjCtx.fillText(`[${c.bpm}]`, cx, cy + 46);

      subjCtx.fillStyle = '#94a3b8';
      subjCtx.fillText(c.role, cx, cy + 57);
    });

    // 核心哲学手稿独白引言
    subjCtx.fillStyle = 'rgba(35, 29, 23, 0.85)';
    subjCtx.fillRect(16, h - hudHeight - 56, w - 32, 44);
    subjCtx.strokeStyle = 'rgba(140, 109, 59, 0.4)';
    subjCtx.strokeRect(16, h - hudHeight - 56, w - 32, 44);

    subjCtx.font = 'italic 10px serif';
    subjCtx.fillStyle = '#fde047';
    subjCtx.textAlign = 'center';
    subjCtx.fillText('“在二维平面，同胞的身躯永远是一条闭合的线段；', w / 2, h - hudHeight - 40);
    subjCtx.fillText('唯有升至空间国俯视，其体内跳动的心室与内脏才毫发毕现！”', w / 2, h - hudHeight - 24);
    subjCtx.font = '9px serif';
    subjCtx.fillStyle = '#94a3b8';
    subjCtx.fillText(`[空间三维矢量: X: ${spacelandGame.player.x.toFixed(1)} | Y: ${spacelandGame.player.y.toFixed(1)} | Z: ${alt.toFixed(1)}]`, w / 2, h - hudHeight - 10);

  } else {
    // 二维受限状态：13px 纤薄视网膜槽中的球体截面脉动
    subjCtx.fillStyle = '#1c1813';
    subjCtx.fillRect(0, 0, w, h);

    const horizonY = (h - hudHeight) / 2;
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
          const alpha = Math.min(0.95, intensity * 0.95);
          const pGrad = subjCtx.createLinearGradient(0, slotTop, 0, slotTop + slotHeight);
          pGrad.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
          pGrad.addColorStop(0.5, `rgba(234, 179, 8, ${alpha})`);
          pGrad.addColorStop(1, `rgba(180, 83, 9, ${alpha * 0.8})`);
          subjCtx.fillStyle = pGrad;
          subjCtx.fillRect(x, slotTop, Math.ceil(colWidth), slotHeight);
        } else if (ray.hitType === 'cabinet') {
          const alpha = Math.min(0.85, intensity * 0.8);
          subjCtx.fillStyle = `rgba(51, 65, 85, ${alpha})`;
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
  }

  // 底部 HUD 状态与文学指引
  subjCtx.fillStyle = '#0f172a';
  subjCtx.fillRect(0, h - hudHeight, w, hudHeight);

  subjCtx.fillStyle = '#d4af37';
  subjCtx.font = 'bold 10.5px serif';
  subjCtx.textAlign = 'center';

  if (isAsc && alt > 0.05) {
    if (alt > 6.0) {
      subjCtx.fillText('【高空广域·俯视苍生】城市全图如薄纸铺展，万家无顶，众生心室齐跳', w / 2, h - 14);
    } else if (alt >= 2.5) {
      subjCtx.fillText('【空间国俯视·洞察密室】四壁成槽，反锁铁箱手稿与同胞心室清晰可辨', w / 2, h - 14);
    } else {
      subjCtx.fillText('【近空特写·洞幽烛微】贴近地面，手稿文字墨迹与心室脉搏纤毫毕现', w / 2, h - 14);
    }
  } else if (spacelandGame.phase === 'CROSS_SECTION') {
    const r = spacelandGame.sphereCrossSectionRadius.toFixed(1);
    subjCtx.fillText(`【反锁书房视界】球体截面脉动 (圆半径: ${r})`, w / 2, h - 14);
  } else {
    subjCtx.fillText('【反锁书房视界】密室四壁死锁 · 探寻高维方向', w / 2, h - 14);
  }

  subjCtx.font = '9.5px serif';
  subjCtx.textAlign = 'left';
  subjCtx.fillText('■ 左直角 90°', 10, h - 14);
  subjCtx.textAlign = 'right';
  subjCtx.fillText('右直角 90° ■', w - 10, h - 14);
}

// URL 查询参数解析，支持通过链接或直达参数直接进入指定幕与状态
try {
  const urlParams = new URLSearchParams(window.location.search);
  const actParam = urlParams.get('act');
  if (actParam === '2' || actParam === 'spaceland') {
    selectLevel(GameLevelId.SPACELAND_PURGE);
    modalOverlay.classList.remove('active');
    currentModalMode = 'NONE';
    if (urlParams.has('ascended') || urlParams.has('z')) {
      spacelandGame.isAscended = true;
      spacelandGame.phase = 'ASCENDED';
      const targetZ = parseFloat(urlParams.get('z') || '3.5');
      spacelandGame.altitude = isNaN(targetZ) ? 3.5 : targetZ;
    }
  } else if (actParam === '1' || actParam === 'flatland') {
    selectLevel(GameLevelId.FLATLAND_ESCAPE);
    modalOverlay.classList.remove('active');
    currentModalMode = 'NONE';
  } else if (actParam === '0' || actParam === 'lineland') {
    selectLevel(GameLevelId.LINELAND_PROLOGUE);
  }
} catch (e) {
  console.warn('URL param parse error:', e);
}

requestAnimationFrame(gameLoop);
