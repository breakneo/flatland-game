import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const USER_DATA_DIR = '/tmp/chrome-test-profile-9333';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--user-data-dir=${USER_DATA_DIR}`,
    `--remote-debugging-port=${PORT}`,
    '--window-size=440,940',
    'http://localhost:5173/',
  ]);
  await sleep(1000);
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('5173'));
  if (!pageTarget) throw new Error('No page target found');

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

  async function evaluate(expression) {
    const r = await sendCommand('Runtime.evaluate', { expression, returnByValue: true });
    return r.result?.value;
  }

  console.log('--- 测试三维上下高程调整与视角动态联动 ---');
  // 1. 设置到第二幕飞升状态
  await evaluate(`
    window.coordinator.switchLevel(2);
    window.coordinator.resetCurrentLevel();
    window.coordinator.spaceland.hasRetrievedManuscript = true;
    window.coordinator.spaceland.triggerAscend();
    window.coordinator.spaceland.altitude = 1.2;
    document.getElementById('modal-overlay').classList.remove('active');
  `);
  await sleep(400);

  // 截图 1：低空俯冲特写 (Z = 1.2)
  let shotLow = await sendCommand('Page.captureScreenshot', { format: 'png' });
  writeFileSync('dist/act2-altitude-low.png', Buffer.from(shotLow.data, 'base64'));
  console.log('已捕获低空俯冲视角截图 (Z = 1.2): dist/act2-altitude-low.png');

  // 2. 模拟升高操作（点击升高按钮或按键 E）
  await evaluate(`
    document.getElementById('btn-elev-up').click();
    window.coordinator.spaceland.changeAltitude(7.0);
  `);
  await sleep(400);

  // 截图 2：高空广域鸟瞰 (Z = 8.2)
  let shotHigh = await sendCommand('Page.captureScreenshot', { format: 'png' });
  writeFileSync('dist/act2-altitude-high.png', Buffer.from(shotHigh.data, 'base64'));
  console.log('已捕获高空广域鸟瞰截图 (Z = 8.2): dist/act2-altitude-high.png');

  const altTitle = await evaluate(`document.getElementById('altitude-title').textContent`);
  console.log('高程控制台读数:', altTitle);

  ws.close();
  chromeProc.kill();
  console.log('=== 三维高度调整与视角动态联动验证完成 ===');
}

run().catch(console.error);
