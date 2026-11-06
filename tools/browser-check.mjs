// 用 CDP 驱动本机 Chrome，对 preview/harness.html 做真实浏览器实测。
// 用法：node tools/browser-check.mjs [场景...]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME = "C:\\Users\\streamax\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe";
const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bd-chrome-"));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu",
  "--window-size=1440,900",
  "about:blank"
], { stdio: "ignore" });

async function versionInfo() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return await r.json();
    } catch { await sleep(150); }
  }
  throw new Error("chrome 未就绪");
}

let id = 0;
const pending = new Map();
const ws = new WebSocket((await versionInfo()).webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}, sessionId) {
  const msgId = ++id;
  const payload = { id: msgId, method, params };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((res) => pending.set(msgId, res));
}

const { targetId } = (await send("Target.createTarget", { url: "about:blank" })).result;
const { sessionId } = (await send("Target.attachToTarget", { targetId, flatten: true })).result;
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

async function goto(url) {
  await send("Page.navigate", { url }, sessionId);
  await sleep(1500);
}
async function evaluate(expr) {
  const r = await send("Runtime.evaluate", {
    expression: expr, returnByValue: true, awaitPromise: true, userGesture: true
  }, sessionId);
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}
async function shot(file) {
  const r = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
}
async function mouse(type, x, y, extra = {}) {
  await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, ...extra }, sessionId);
}

const fileUrl = "file:///" + path.join(ROOT, "preview", "harness.html").replace(/\\/g, "/");
const out = [];
const log = (...a) => { const s = a.join(" "); out.push(s); console.log(s); };

try {
  await goto(fileUrl + "?route=video");
  await sleep(800);

  log("=== 基础 ===");
  log(await evaluate(`(() => {
    const p = document.querySelector("#biliding-root .bd-player");
    const body = document.querySelector("#biliding-root .im-chat-body");
    if (!p) return "NO PLAYER";
    const r = p.getBoundingClientRect();
    return JSON.stringify({
      playerW: Math.round(r.width), playerH: Math.round(r.height),
      bodyW: body.clientWidth, bodyScrollH: body.scrollHeight, bodyClientH: body.clientHeight,
      canScrollY: body.scrollHeight > body.clientHeight,
      overflowY: getComputedStyle(body).overflowY,
      overlayCount: document.querySelectorAll(".bd-player").length
    });
  })()`));

  log("=== 浮窗按钮 ===");
  log(await evaluate(`(() => {
    const btn = document.querySelector('.bd-player-tools [data-pbtn="float"]') ||
                document.querySelector('[data-act="player-float"]');
    if (!btn) return "NO FLOAT BTN";
    btn.click();
    const p = document.querySelector("#biliding-root .bd-player");
    const cs = p && getComputedStyle(p);
    const r = p && p.getBoundingClientRect();
    return JSON.stringify({
      cls: p && p.className,
      parent: p && (p.parentElement.id || p.parentElement.className),
      visibility: cs && cs.visibility, pointerEvents: cs && cs.pointerEvents,
      position: cs && cs.position, rect: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) },
      bodyHidden: p && p.closest("body > *") ? (p.closest("body > *").id || p.closest("body > *").className) : null
    });
  })()`));
  await sleep(400);
  await shot(path.join(ROOT, "tools", "shot-float.png"));

  log("=== 浮窗拖动（把手） ===");
  const barBox = await evaluate(`(() => {
    const bar = document.querySelector("#biliding-root .bd-player-bar") || document.querySelector(".bd-player-bar");
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height) };
  })()`);
  log("bar:", JSON.stringify(barBox));
  if (barBox && barBox.w > 0) {
    await mouse("mousePressed", barBox.x, barBox.y);
    for (let i = 1; i <= 6; i++) await mouse("mouseMoved", barBox.x - i * 20, barBox.y + i * 10);
    await mouse("mouseReleased", barBox.x - 120, barBox.y + 60);
    await sleep(200);
    log(await evaluate(`(() => {
      const p = document.querySelector("#biliding-root .bd-player") || document.querySelector(".bd-player");
      const r = p.getBoundingClientRect();
      return JSON.stringify({ afterDragX: Math.round(r.x), afterDragY: Math.round(r.y), inlineLeft: p.style.left, inlineTop: p.style.top });
    })()`));
  } else {
    log("把手不可见（浮窗样式未生效）");
  }

  log("=== 尺寸滑杆放大 ===");
  log(await evaluate(`(() => {
    const before = document.querySelector("#biliding-root .bd-player");
    const w0 = Math.round(before.getBoundingClientRect().width);
    const btn = document.querySelector('.bd-player-tools [data-pbtn="size"]');
    if (!btn) return "NO SIZE BTN";
    btn.click();
    const menu = document.querySelector(".bd-size-menu");
    if (!menu) return "NO MENU";
    const range = menu.querySelector('input[type="range"]');
    if (!range) return "NO RANGE";
    range.value = range.max;
    range.dispatchEvent(new Event("input", { bubbles: true }));
    const w1 = Math.round(document.querySelector("#biliding-root .bd-player").getBoundingClientRect().width);
    const info = { before: w0, afterSlideToMax: w1, sliderMax: range.max, grew: w1 > w0 };
    menu.remove();
    return JSON.stringify(info);
  })()`));

  log("=== 对话纵向滚动条 ===");
  log(await evaluate(`(() => {
    const body = document.querySelector("#biliding-root .im-chat-body");
    const oy = getComputedStyle(body).overflowY;
    const scrollable = body.scrollHeight > body.clientHeight;
    body.scrollTop = 400;
    return JSON.stringify({ overflowY: oy, scrollable, scrollTopApplied: body.scrollTop > 0, scrollTop: body.scrollTop });
  })()`));

  await shot(path.join(ROOT, "tools", "shot-final.png"));
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(ROOT, "tools", "browser-report.txt"), out.join("\n"));
  try { ws.close(); } catch {}
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(process.exitCode || 0);
}
