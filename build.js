// 把 src/ 下的片段按顺序拼成单文件用户脚本 biliding.user.js，
// 并生成 install.html（一键复制全文，避免误双击 .js 被 Windows 脚本宿主打开）。
// 用法：node build.js
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "src");
const order = [
  "00-meta.js",
  "10-core.js",
  "12-title.js",
  "15-skins.js",
  "20-data.js",
  "30-css-core.js",
  "32-css-ding.js",
  "34-css-feishu.js",
  "36-css-wecom.js",
  "40-shell.js",
  "50-render.js",
  "55-player.js",
  "57-account.js",
  "90-boot.js"
];

let out = "";
for (const f of order) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) throw new Error("缺少源文件: " + f);
  out += fs.readFileSync(p, "utf8").replace(/\s+$/, "") + "\n";
}

const target = path.join(__dirname, "biliding.user.js");
// 不带 BOM：用户脚本统一用 UTF-8 无 BOM，Tampermonkey / Violentmonkey 都按 UTF-8 解析。
fs.writeFileSync(target, out, "utf8");
console.log("built", target, (Buffer.byteLength(out) / 1024).toFixed(1) + " KB", "(UTF-8 no BOM)");

// ---------- install.html ----------
const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sizeKb = (Buffer.byteLength(out) / 1024).toFixed(1);

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>B钉 v2 · 安装</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 40px 20px; background: #F5F6F8; color: #1F2329;
    font: 14px/1.7 "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .sub { color: #8A8F99; font-size: 13px; margin-bottom: 24px; }
  .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px 22px; margin-bottom: 16px; }
  ol { margin: 0; padding-left: 20px; }
  li { margin: 6px 0; }
  code { background: #F1F2F4; border-radius: 4px; padding: 1px 6px; font-size: 12.5px; }
  .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
  button { height: 34px; padding: 0 18px; border-radius: 8px; border: 0; cursor: pointer;
    background: #1A7AF8; color: #fff; font-size: 13.5px; font-family: inherit; }
  button:hover { filter: brightness(1.06); }
  button.ghost { background: #fff; color: #1F2329; border: 1px solid #DDE1E7; }
  .ok { color: #00A870; font-size: 13px; }
  textarea { width: 100%; height: 180px; margin-top: 14px; font: 12px/1.5 ui-monospace, Consolas, monospace;
    border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; resize: vertical; background: #FAFBFC; }
  .warn { background: #FFF7E6; border: 1px solid #FFE3A8; color: #8A5A00; border-radius: 10px; padding: 12px 14px; font-size: 13px; }
  a { color: #1A7AF8; }
  @media (prefers-color-scheme: dark) {
    body { background: #16181C; color: #E6E9EF; }
    .card { background: #1E2126; border-color: #2B3038; }
    code { background: #262B33; }
    button.ghost { background: #1E2126; color: #E6E9EF; border-color: #2B3038; }
    textarea { background: #14161A; color: #E6E9EF; border-color: #2B3038; }
    .warn { background: #2A2416; border-color: #4A3E1F; color: #E8C87A; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>B钉 v2 · 安装</h1>
  <div class="sub">钉钉 / 飞书 / 企业微信 三合一 B站皮肤 · 单文件 ${sizeKb} KB · UTF-8</div>

  <div class="card">
    <ol>
      <li>浏览器装 <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer">Tampermonkey</a>（或 Violentmonkey）。</li>
      <li>点下面的「复制脚本全文」。</li>
      <li>打开 Tampermonkey 面板 →「添加新脚本」，<b>全选删掉模板</b>，粘贴，Ctrl+S 保存。</li>
      <li>打开 <a href="https://www.bilibili.com/" target="_blank" rel="noreferrer">bilibili.com</a>，首屏就是 IM 界面；顶栏调色板图标切换钉钉 / 飞书 / 企业微信。</li>
    </ol>
    <div class="row">
      <button id="copy">复制脚本全文</button>
      <button class="ghost" id="pick">选中 textarea 全文</button>
      <span class="ok" id="state"></span>
    </div>
    <textarea id="src" spellcheck="false" readonly>${escHtml(out)}</textarea>
  </div>

  <div class="card">
    <b>只想先看效果？</b> 不用装任何东西，打开 <a href="./preview/harness.html" target="_blank">preview/harness.html</a>
    即可看到三套皮肤的假数据演示（<code>?skin=feishu</code> / <code>?skin=wecom</code> / <code>?route=video</code>）。
  </div>

  <div class="warn">
    <b>不要双击 <code>biliding.user.js</code>。</b> Windows 会用「脚本宿主」打开 .js 并弹
    「未结束的字符串常量 / 800A03F7」——那是 wscript 在跑浏览器脚本，属于正常报错，文件本身没坏。
    用户脚本只能由浏览器里的油猴执行。
  </div>
</div>
<script>
  var src = document.getElementById("src");
  var stateEl = document.getElementById("state");
  function flash(t) { stateEl.textContent = t; setTimeout(function () { stateEl.textContent = ""; }, 2200); }
  document.getElementById("copy").addEventListener("click", function () {
    src.focus(); src.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(src.value).then(function () { flash("已复制，去 Tampermonkey 粘贴"); },
        function () { flash(ok ? "已复制（execCommand）" : "复制失败，请手动全选复制"); });
    } else {
      flash(ok ? "已复制，去 Tampermonkey 粘贴" : "复制失败，请手动全选复制");
    }
  });
  document.getElementById("pick").addEventListener("click", function () {
    src.focus(); src.select(); flash("已全选，Ctrl+C 复制");
  });
</script>
</body>
</html>
`;

const installTarget = path.join(__dirname, "install.html");
fs.writeFileSync(installTarget, html, "utf8");
console.log("built", installTarget, (Buffer.byteLength(html) / 1024).toFixed(1) + " KB");
