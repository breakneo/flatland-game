import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--user-data-dir=/tmp/chrome-act2-profile',
    '--remote-debugging-port=9333',
    '--remote-debugging-address=127.0.0.1',
    '--disable-gpu',
    '--window-size=1200,900',
    'http://127.0.0.1:5173/'
  ]);
  chrome.stderr.on('data', d => console.error('chrome err:', d.toString()));

  try {
    // Wait for Chrome to listen on 9333
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9333/json/list');
        const list = await res.json();
        if (list.length > 0 && list[0].webSocketDebuggerUrl) {
          wsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch (e) {
        // wait
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!wsUrl) {
      throw new Error('Failed to connect to Chrome debug port');
    }

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');

    // Wait 1s for initial render
    await new Promise(r => setTimeout(r, 1000));

    // Click Act 2 tab
    await send('Runtime.evaluate', {
      expression: `
        const tabs = document.querySelectorAll('.act-tab-btn');
        if (tabs && tabs[2]) {
          tabs[2].click();
        }
      `
    });

    await new Promise(r => setTimeout(r, 800));

    // Capture Act 2 Initial (Flat 2D state)
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('dist/check-act2-flat.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved dist/check-act2-flat.png');

    // Trigger detachment / ascension
    await send('Runtime.evaluate', {
      expression: `
        // Click detachment button if present or press Space to ascend
        const btnDetach = document.getElementById('btn-spaceland-detach');
        if (btnDetach) {
          btnDetach.click();
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        }
      `
    });

    // Wait for detachment animation
    await new Promise(r => setTimeout(r, 2200));

    // Capture Act 2 Ascended (3D Downward Perspective View!)
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('dist/check-act2-ascended-mid.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved dist/check-act2-ascended-mid.png');

    // Elevate up to high altitude Z=8.5
    await send('Runtime.evaluate', {
      expression: `
        const btnUp = document.getElementById('btn-elev-up');
        for (let i = 0; i < 15; i++) {
          if (btnUp) btnUp.click();
        }
      `
    });

    await new Promise(r => setTimeout(r, 800));

    // Capture High Altitude View
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('dist/check-act2-ascended-high.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved dist/check-act2-ascended-high.png');

    // Elevate down to low altitude close-up Z=1.0
    await send('Runtime.evaluate', {
      expression: `
        const btnDown = document.getElementById('btn-elev-down');
        for (let i = 0; i < 30; i++) {
          if (btnDown) btnDown.click();
        }
      `
    });

    await new Promise(r => setTimeout(r, 800));

    // Capture Low Altitude Close-up
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('dist/check-act2-ascended-low.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved dist/check-act2-ascended-low.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
