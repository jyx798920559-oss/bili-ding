// 诊断：聊天区横向溢出 + 浮窗放大出界
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME = "C:\\Users\\streamax\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9350;
const ROOT = process.cwd();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "bdv-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--window-size=1440,900", "about:blank"], { stdio: "ignore" });

let info;
for (let i = 0; i < 80; i++) {
  try { info = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch { await sleep(150); }
}
let id = 0;
const pending = new Map();
const ws = new WebSocket(info.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}, sessionId) => {
  const i = ++id; const p = { id: i, method, params }; if (sessionId) p.sessionId = sessionId;
  ws.send(JSON.stringify(p)); return new Promise((r) => pending.set(i, r));
};
const { targetId } = (await send("Target.createTarget", { url: "about:blank" })).result;
const { sessionId } = (await send("Target.attachToTarget", { targetId, flatten: true })).result;
await send("Network.enable", {}, sessionId);
await send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r.result?.exceptionDetails) return "ERR:" + (r.result.exceptionDetails.exception?.description || "");
  return r.result?.result?.value;
};
const shot = async (f) => {
  const r = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  fs.writeFileSync(f, Buffer.from(r.result.data, "base64"));
};

try {
  await ev("localStorage.clear()");
  await send("Page.navigate", { url: "file:///" + path.join(ROOT, "preview", "harness.html").replace(/\\/g, "/") + "?route=video&t=" + Date.now() }, sessionId);
  await sleep(3200);

  console.log("INLINE:", await ev(`(() => {
    const b = document.querySelector(".im-chat-body");
    const m = document.querySelector(".im-msg-main.wide");
    return JSON.stringify({
      cls: b.className, scrollW: b.scrollWidth, clientW: b.clientWidth,
      overflowX: getComputedStyle(b).overflowX,
      mainW: m ? Math.round(m.getBoundingClientRect().width) : 0
    });
  })()`));

  await ev(`document.querySelector('.bd-player-tools [data-pbtn="float"]').click()`);
  await sleep(400);
  await ev(`(() => {
    document.querySelector('.bd-player-tools [data-pbtn="size"]').click();
    const menu = document.querySelector(".bd-size-menu");
    const r = menu.querySelector('input[type="range"]');
    r.value = r.max; r.dispatchEvent(new Event("input", { bubbles: true }));
    menu.remove();
  })()`);
  await sleep(600);

  console.log("FLOAT_MAX:", await ev(`(() => {
    const p = document.querySelector(".bd-player.float");
    const r = p.getBoundingClientRect();
    const b = document.querySelector(".im-chat-body");
    return JSON.stringify({
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width),
      right: Math.round(r.right), vw: innerWidth,
      overRight: Math.round(r.right) > innerWidth,
      styleLeft: p.style.left, bodyHScroll: b.scrollWidth > b.clientWidth
    });
  })()`));
  await shot(path.join(ROOT, "tools", "v-floatmax.png"));

  // 收回聊天区，确认没有残留横向滚动条
  await ev(`document.querySelector('.bd-player-tools [data-pbtn="float"]').click()`);
  await sleep(500);
  console.log("BACK_INLINE:", await ev(`(() => {
    const b = document.querySelector(".im-chat-body");
    const p = document.querySelector(".bd-player");
    return JSON.stringify({
      cls: b.className, hScroll: b.scrollWidth > b.clientWidth,
      playerPos: p.style.position, playerW: Math.round(p.getBoundingClientRect().width)
    });
  })()`));
  await shot(path.join(ROOT, "tools", "v-back.png"));
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(process.exitCode || 0);
}
