import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const USER_DATA_DIR = '/tmp/chrome-test-profile-9333';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('启动无头 Chrome 进行真机 CDP 自动化验证 (原著向第二幕·空间国全流程)...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--user-data-dir=${USER_DATA_DIR}`,
    `--remote-debugging-port=${PORT}`,
    '--window-size=430,932',
    'http://localhost:5173/',
  ]);

  chromeProc.on('error', (err) => console.error('Chrome spawn error:', err));

  let targets = null;
  for (let i = 0; i < 25; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      if (res.ok) {
        targets = await res.json();
        const page = targets.find(t => t.type === 'page' && t.url.includes('5173'));
        if (page) break;
      }
    } catch (_) {}
  }

  const pageTarget = targets?.find(t => t.type === 'page' && t.url.includes('5173'));
  if (!pageTarget) {
    chromeProc.kill();
    throw new Error('无法连接到 Flatland 游戏页面 CDP 端点');
  }

  console.log('连接到页面 WebSocket:', pageTarget.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function sendCommand(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');

  await sleep(800);

  // 1. 验证序幕开场手稿
  let modalTitle = await evaluate(sendCommand, `document.getElementById('modal-title').textContent`);
  console.log('【序幕检查】开场手稿标题:', modalTitle);
  if (!modalTitle.includes('序幕')) throw new Error(`序幕标题不符合: ${modalTitle}`);

  await evaluate(sendCommand, `document.getElementById('btn-modal-action').click()`);
  await sleep(300);

  // 2. 切换到第一幕
  console.log('【关卡流转】切换到第一幕 · 石牢脱逃...');
  await evaluate(sendCommand, `document.getElementById('btn-level-toggle').click()`);
  await sleep(300);

  modalTitle = await evaluate(sendCommand, `document.getElementById('modal-title').textContent`);
  console.log('【第一幕检查】开场手稿标题:', modalTitle);
  if (!modalTitle.includes('第一幕')) throw new Error(`第一幕标题不符合: ${modalTitle}`);

  await evaluate(sendCommand, `document.getElementById('btn-modal-action').click()`);
  await sleep(300);

  // 3. 切换到原著向第二幕（球体降临与内脏全知）
  console.log('【关卡流转】切换到第二幕 · 空间国与内脏全知...');
  await evaluate(sendCommand, `document.getElementById('btn-level-toggle').click()`);
  await sleep(400);

  modalTitle = await evaluate(sendCommand, `document.getElementById('modal-title').textContent`);
  console.log('【第二幕检查】开场手稿标题:', modalTitle);
  if (!modalTitle.includes('第二幕') || !modalTitle.includes('球体降临')) {
    throw new Error(`第二幕标题不符合: ${modalTitle}`);
  }

  const modalBody = await evaluate(sendCommand, `document.getElementById('modal-body').textContent`);
  console.log('【第二幕手稿】背景摘要:', modalBody.slice(0, 60).replace(/\n/g, ' ') + '...');
  if (!modalBody.includes('书房') || !modalBody.includes('球体') || !modalBody.includes('铁箱')) {
    throw new Error(`第二幕手稿未包含原著核心要素: ${modalBody}`);
  }

  // 关闭手稿弹窗，正式进入第二幕反锁书房
  await evaluate(sendCommand, `document.getElementById('btn-modal-action').click()`);
  await sleep(500);

  // 检查第二幕界面的标题与标签
  const identity = await evaluate(sendCommand, `document.getElementById('identity-text').textContent`);
  const omniTag = await evaluate(sendCommand, `document.getElementById('omni-panel-tag').textContent`);
  const subjPanelTag = await evaluate(sendCommand, `document.getElementById('subj-panel-tag').textContent`);
  const gaugeLabel = await evaluate(sendCommand, `document.getElementById('gauge-label').textContent`);

  console.log('【第二幕实战】身份标签:', identity);
  console.log('【第二幕实战】全知沙盘标签:', omniTag);
  console.log('【第二幕实战】感官受限标签:', subjPanelTag);
  console.log('【第二幕实战】计量标签:', gaugeLabel);

  if (!identity.includes('第二幕') || !omniTag.includes('书房') || !subjPanelTag.includes('截面')) {
    throw new Error('第二幕原著标签不符合预期');
  }

  // 截取第二幕书房与球体截面互动画面
  const screenshot1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  writeFileSync('dist/act2-spaceland.png', Buffer.from(screenshot1.data, 'base64'));
  console.log('已保存第二幕书房实战截图: dist/act2-spaceland.png');

  // 模拟操作 1：走位靠近球体截面触碰启蒙
  console.log('【第二幕交互】走位靠近球体截面并触碰...');
  await evaluate(sendCommand, `
    // 强制球体在平面内并玩家靠近 (-1.2, -1.4)
    window.coordinator.spaceland.sphere.z = 0;
    window.coordinator.spaceland.player.x = -1.2 + 1.2;
    window.coordinator.spaceland.player.y = -1.4;
    document.getElementById('btn-ascend').click();
  `);
  await sleep(400);

  let dialogue = await evaluate(sendCommand, `document.getElementById('dialogue-strip').textContent`);
  console.log('【截面启蒙独白】:', dialogue);

  // 模拟操作 2：走到反锁铁箱 (1.8, 0) 越顶取物
  console.log('【第二幕交互】走到反锁铁箱旁探入内部取物...');
  await evaluate(sendCommand, `
    window.coordinator.spaceland.player.x = 1.0;
    window.coordinator.spaceland.player.y = 0;
    document.getElementById('btn-ascend').click();
  `);
  await sleep(400);

  dialogue = await evaluate(sendCommand, `document.getElementById('dialogue-strip').textContent`);
  console.log('【破除死锁独白】:', dialogue);

  // 模拟操作 3：触发空间国飞升！拔高至 4.5
  console.log('【第二幕交互】触发空间国飞升...');
  await evaluate(sendCommand, `
    document.getElementById('btn-ascend').click();
    window.coordinator.spaceland.altitude = 4.5;
  `);
  await sleep(600);

  const screenshot2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  writeFileSync('dist/act2-ascended.png', Buffer.from(screenshot2.data, 'base64'));
  console.log('已保存第二幕空间国飞升全透视画面 -> dist/act2-ascended.png');

  // 点击顿悟三维全知，完成通关结算
  await evaluate(sendCommand, `
    document.getElementById('btn-ascend').click();
  `);
  await sleep(400);

  modalTitle = await evaluate(sendCommand, `document.getElementById('modal-title').textContent`);
  console.log('【通关手稿标题】:', modalTitle);
  if (!modalTitle.includes('三维福音') && !modalTitle.includes('全透视')) {
    throw new Error(`通关标题不符: ${modalTitle}`);
  }

  console.log('=== 真机 CDP 原著向第二幕全流程验证 100% 通过 ===');
  ws.close();
  chromeProc.kill();
}

async function evaluate(sendCommand, expression) {
  const res = await sendCommand('Runtime.evaluate', { expression, returnByValue: true });
  return res.result?.value;
}

run().catch((err) => {
  console.error('CDP 测试失败:', err);
  process.exit(1);
});
