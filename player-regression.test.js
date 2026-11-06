const fs = require("fs");
const assert = require("assert");
const player = fs.readFileSync("src/55-player.js", "utf8");
const css = fs.readFileSync("src/30-css-core.js", "utf8");

// 播放源：必须是整张视频页（用户明确要求，不要轻量嵌入器）
assert.match(
  player,
  /tpl:\s*'\/\/www\.bilibili\.com\/video\/__BVID__\//,
  "播放源必须是同源整张视频页"
);
assert.doesNotMatch(
  player,
  /tpl:\s*'[^']*player\.bilibili\.com\/player\.html/,
  "不允许使用 player.bilibili.com 轻量嵌入器"
);

// 尺寸滑杆：可连续放大
assert.match(player, /type="range" min="240" max="1600" step="10"/, "尺寸菜单提供连续宽度滑杆");
assert.match(player, /function playerMaxW/, "宽度上限按视口计算");
assert.match(player, /window\.innerWidth[^;]*-\s*32/, "浮窗宽度上限取视口宽度");

// 浮窗定位：不能再把播放器挂到 body 下（会被「隐藏原站页面」规则连带隐藏）
assert.doesNotMatch(player, /document\.body\.appendChild\(playerEl\)/, "浮窗不能挂到 body 下");
assert.match(player, /function floatHost/, "浮窗有独立的宿主节点");
assert.match(player, /function clampFloatPos/, "浮窗位置必须钳在视口内");

// 拖拽必须全局跟踪，否则移出把手就丢事件
assert.match(player, /window\.addEventListener\("pointermove"/, "拖拽在 window 上持续跟踪");
assert.match(player, /function setFloatViewportPos/, "浮窗坐标统一换算");

// 播放中不重建聊天区（否则 iframe 重载、画面卡住）
const render = fs.readFileSync("src/50-render.js", "utf8");
assert.match(render, /\.bd-player\.playing/, "播放中的播放器不随渲染重建");

// 聊天区默认纵向滚动，横向滚动只在超宽时开启
assert.match(css, /\.im-chat-body\s*\{[^}]*overflow-y:\s*auto/s, "聊天区保持纵向滚动");
assert.match(css, /\.im-chat-body\s*\{[^}]*overflow-x:\s*hidden/s, "默认不出现横向滚动条");
assert.match(css, /\.im-chat-body\.has-wide-player\s*\{\s*overflow-x:\s*auto/, "超宽时才开横向滚动");
assert.match(css, /\.bd-size-control input\s*\{[^}]*width:\s*100%/s, "滑杆在菜单内可用");

console.log("player regression checks passed");
