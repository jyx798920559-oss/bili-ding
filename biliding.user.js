// ==UserScript==
// @name         B钉 · B站 IM 皮肤（钉钉 / 飞书 / 企业微信）
// @namespace    biliding.local
// @version      2.1.0
// @author       BiliDing
// @description  把 B 站装进办公 IM：首页推荐流变成消息会话、分区变成群聊、视频页变成单聊、评论区变成聊天记录。内置钉钉 / 飞书 / 企业微信三套皮肤，一键切换。纯前端皮肤，不写 B站任何数据。
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @run-at       document-start
// @grant        none
// @noframes
// @license      MIT
// ==/UserScript==

/*!
 * B钉（BiliDing）v2
 * 三合一 IM 外观：钉钉 PC 8.x / 飞书 IM / 企业微信 5.x。
 * 思路参考 czm15053/linuxdo-idea-ui 的 IM 三合一皮肤与 Jack-Cherish/BiliShu 的 B站移植，
 * 本项目为独立实现，只读取 B站公开接口与已渲染 DOM。
 *
 * 注意：这是「用户脚本」，只能在浏览器里由 Tampermonkey / Violentmonkey 执行。
 * 双击 .js 会用 Windows 脚本宿主（wscript）打开并报语法错误，这是正常现象，不代表脚本坏了。
 */
(function () {
  "use strict";

  // ======================= 0. 启动判定 =======================
  var IS_TOP = true;
  try { IS_TOP = window.top === window.self; } catch (e) { IS_TOP = false; }
  var HOST = location.hostname;
  // 本地预览（file:// 打开 harness 页面）时通过 window.__BILIDING_MOCK__ 注入假数据，
  // 该全局只可能由使用者自己在本机页面里设置，正式站点不会存在。
  var MOCK = window.__BILIDING_MOCK__ || null;
  // 预览页用 file:// 打开，同目录的脚本也不算「非目标站点」
  var IS_PREVIEW = /^file:$/.test(location.protocol);
  if (!IS_TOP) return;
  if (!MOCK && !IS_PREVIEW && !/^www\.bilibili\.com$|^search\.bilibili\.com$/.test(HOST)) return;
  var ROOT_CLASS = "im-theme";
  var DARK_CLASS = "im-dark";
  var STYLE_ID = "biliding-style";
  var FAVICON_ID = "biliding-favicon";
  var LS = {
    title: "biliding-title-custom",
    skin: "biliding-skin",
    dark: "biliding-dark",
    mode: "biliding-color-mode",
    listW: "biliding-list-width",
    railW: "biliding-rail-width",
    navW: "biliding-nav-width",
    org: "biliding-org-name",
    mask: "biliding-mask",
    playerW: "biliding-player-width",
    blur: "biliding-page-blur",
    aliasOff: "biliding-alias-off"
  };

  // ======================= 1. 工具 =======================
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function stripText(html) {
    return String(html == null ? "" : html)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }
  function hashStr(s) {
    var h = 0, str = String(s || "");
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function fmtCount(n) {
    n = Number(n) || 0;
    if (n <= 0) return "";
    if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "亿";
    if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
    return String(n);
  }
  function fmtDur(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = (h ? String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
    return h ? h + ":" + mm : mm;
  }
  function fmtRel(ts) {
    if (!ts) return "";
    var now = Date.now() / 1000, d = now - Number(ts);
    if (d < 60) return "刚刚";
    if (d < 3600) return Math.floor(d / 60) + "分钟前";
    if (d < 86400) return Math.floor(d / 3600) + "小时前";
    if (d < 86400 * 30) return Math.floor(d / 86400) + "天前";
    var t = new Date(Number(ts) * 1000);
    return t.getFullYear() === new Date().getFullYear()
      ? (t.getMonth() + 1) + "月" + t.getDate() + "日"
      : t.getFullYear() + "/" + (t.getMonth() + 1) + "/" + t.getDate();
  }
  function fmtClock(ts) {
    if (!ts) return "";
    var t = new Date(Number(ts) * 1000);
    return String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
  }
  function fmtDate(ts) {
    if (!ts) return "";
    var t = new Date(Number(ts) * 1000);
    return (t.getMonth() + 1) + "月" + t.getDate() + "日 " + fmtClock(ts);
  }
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }
  function lsGet(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
  }
  function toHttp(u) { return String(u || "").replace(/^http:\/\//, "https://").replace(/^\/\//, "https://"); }
  function biliVideoUrl(it) {
    if (it.bvid) return "/video/" + it.bvid + "/";
    if (it.aid) return "/video/av" + it.aid + "/";
    if (it.id && String(it.id).indexOf("BV") === 0) return "/video/" + it.id + "/";
    return "/video/" + (it.bvid || "");
  }
  function clip(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n) + "…" : s;
  }
  // 昵称化名：真实 UP 主 / 吧友名字在 IM 里太扎眼，统一换成固定虚拟人名。
  // 同一个原名用 hash 取同一名字，既稳定又不像真人；localStorage 关掉就显示原名。
  var ALIAS_SURNAMES = ["林", "周", "陈", "许", "沈", "顾", "唐", "苏", "叶", "韩", "陆", "江"];
  var ALIAS_GIVEN = ["望舒", "砚", "亦然", "知远", "清和", "若川", "小满", "斯年", "念之", "以宁", "景行", "南乔", "予安", "星野", "子墨"];
  function aliasOf(name) {
    var s = String(name || "").trim();
    if (!s) return s;
    if (aliasOff()) return s;
    var h = hashStr(s);
    return ALIAS_SURNAMES[h % ALIAS_SURNAMES.length] + ALIAS_GIVEN[(h >> 5) % ALIAS_GIVEN.length];
  }
  function aliasOff() { return lsGet(LS.aliasOff, "") === "1"; }
  function toggleAlias() {
    lsSet(LS.aliasOff, aliasOff() ? "" : "1");
    toast(aliasOff() ? "已切回真实昵称" : "已切回化名显示");
    applyRoute();
  }

  // ======================= 2. 图标 =======================
  var SVG = {};
  function ic(name, body) {
    SVG[name] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
    return SVG[name];
  }
  ic("msg", '<path d="M20.5 11.6c0 4.1-3.8 7.4-8.5 7.4-1 0-2-.2-2.9-.4L4 20.5l1.3-3.7A7.2 7.2 0 0 1 3.5 11.6C3.5 7.5 7.3 4.2 12 4.2s8.5 3.3 8.5 7.4Z"/>');
  ic("bell", '<path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z"/><path d="M10.3 19.5a2 2 0 0 0 3.4 0"/>');
  ic("mail", '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m3.8 7 8.2 6 8.2-6"/>');
  ic("bookmark", '<path d="M6.5 4.5h11v15l-5.5-4-5.5 4Z"/>');
  ic("chat", '<path d="M8.5 5.5h11a1.6 1.6 0 0 1 1.6 1.6v7.3a1.6 1.6 0 0 1-1.6 1.6h-6.8L8 19.5v-3.5H8a1.6 1.6 0 0 1-1.6-1.6V7.1A1.6 1.6 0 0 1 8 5.5Z"/><path d="M4 9.5v5.4"/>');
  ic("doc", '<path d="M13.5 3.5H7a1.6 1.6 0 0 0-1.6 1.6v13.8A1.6 1.6 0 0 0 7 20.5h10a1.6 1.6 0 0 0 1.6-1.6V8.5Z"/><path d="M13.5 3.5v5h5.1"/><path d="M9 13.5h6M9 16.6h4"/>');
  ic("table", '<rect x="3.2" y="4.5" width="17.6" height="15" rx="2"/><path d="M3.2 9.6h17.6M9.4 9.6v9.9M15.2 9.6v9.9"/>');
  ic("mic", '<rect x="9.2" y="3.5" width="5.6" height="9.6" rx="2.8"/><path d="M6 11.2a6 6 0 0 0 12 0M12 17.2v3.3"/>');
  ic("grid", '<rect x="3.6" y="3.6" width="7" height="7" rx="1.8"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.8"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.8"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.8"/>');
  ic("book", '<path d="M20.5 4.5H8.2A3.2 3.2 0 0 0 5 7.7v11.8h12.3a3.2 3.2 0 0 1 3.2 3.2Z" transform="translate(0 -3)"/><path d="M5 16.5h15.5"/>');
  ic("video", '<rect x="3" y="6.5" width="12.4" height="11" rx="2.2"/><path d="m15.4 10.4 5.1-2.6v8.4l-5.1-2.6Z"/>');
  ic("cal", '<rect x="3.4" y="5.4" width="17.2" height="15.2" rx="2.2"/><path d="M8 3.4v3.6M16 3.4v3.6M3.4 10.2h17.2"/>');
  ic("todo", '<rect x="3.4" y="4.6" width="17.2" height="15.4" rx="2.2"/><path d="m7.4 12.2 2.6 2.6 5-5.4"/>');
  ic("plus", '<path d="M12 5v14M5 12h14"/>');
  ic("search", '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>');
  ic("settings", '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.2a1.9 1.9 0 1 1 0-3.8h.3a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.4.9Z"/>');
  ic("refresh", '<path d="M20 11.4a8 8 0 1 0-2.4 6.4"/><path d="M20 4.6v6.2h-6.2"/>');
  ic("more", '<circle cx="5.2" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.8" cy="12" r="1.5" fill="currentColor" stroke="none"/>');
  ic("resize", '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.2"/><path d="M14.2 15.8l3.6-3.6M14.2 12.2v3.6h3.6"/>');
  ic("smile", '<circle cx="12" cy="12" r="8.6"/><path d="M8.6 14.2c.9 1.2 2.1 1.8 3.4 1.8s2.5-.6 3.4-1.8"/><circle cx="9.3" cy="10.1" r=".9" fill="currentColor" stroke="none"/><circle cx="14.7" cy="10.1" r=".9" fill="currentColor" stroke="none"/>');
  ic("thumb", '<path d="M7.5 20.5V9.4l4.7-5.4 1 1a3.6 3.6 0 0 1 .9 3.1l-.6 2.3h4.7a1.9 1.9 0 0 1 1.9 2.2l-1 6.6a1.9 1.9 0 0 1-1.9 1.6Z"/><path d="M7.5 9.4H3.6v11.1h3.9"/>');
  ic("at", '<circle cx="12" cy="12" r="3.8"/><path d="M15.8 8.2v4.7a2.8 2.8 0 0 0 5.6 0V12a9 9 0 1 0-3.6 7.2"/>');
  ic("font", '<path d="M4 19 9.6 5h1.4L16.6 19M6.6 14.4h7.4"/><path d="M17.4 19h3.2"/>');
  ic("scissors", '<circle cx="6.4" cy="17.4" r="2.6"/><circle cx="17.6" cy="17.4" r="2.6"/><path d="M8.2 15.6 18 4M15.9 15.6 6 4"/>');
  ic("folder", '<path d="M3.6 7.4a2 2 0 0 1 2-2h3.3l2 2.4h7.5a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z"/>');
  ic("image", '<rect x="3.4" y="4.8" width="17.2" height="14.4" rx="2.2"/><circle cx="8.6" cy="9.8" r="1.7"/><path d="m4.4 17.4 5-5 3.4 3.2 3-2.8 3.8 3.6"/>');
  ic("link", '<path d="M10.4 13.6a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.6 6.7"/><path d="M13.6 10.4a4 4 0 0 0-5.7 0L5.3 13a4 4 0 1 0 5.7 5.7l1.3-1.3"/>');
  ic("code", '<path d="m8.6 8.4-4.4 3.6 4.4 3.6M15.4 8.4l4.4 3.6-4.4 3.6"/>');
  ic("list", '<path d="M8.6 6.6h11M8.6 12h11M8.6 17.4h11"/><circle cx="4.6" cy="6.6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.6" cy="17.4" r="1.2" fill="currentColor" stroke="none"/>');
  ic("olist", '<path d="M9.4 6.6h10.2M9.4 12h10.2M9.4 17.4h10.2"/><path d="M4 5.4h1v3M3.6 8.4h2M3.6 14h2l-2 2.2h2"/>');
  ic("bold", '<path d="M7 4.6h5.6a3.7 3.7 0 0 1 0 7.4H7Z"/><path d="M7 12h6.4a3.7 3.7 0 0 1 0 7.4H7Z"/>');
  ic("italic", '<path d="M15 4.6h-4M13 4.6 10 19.4M10 19.4H6"/>');
  ic("underline", '<path d="M6.6 4.6v6a5.4 5.4 0 0 0 10.8 0v-6M5 20.4h14"/>');
  ic("strike", '<path d="M4.6 12h14.8"/><path d="M16.6 7.4a4.4 4.4 0 0 0-4.4-2.8c-2.6 0-4.4 1.4-4.4 3.4 0 3.6 9 2.2 9 6 0 2.2-2 3.6-4.8 3.6a4.9 4.9 0 0 1-4.7-3"/>');
  ic("phone", '<path d="M6.2 3.6h2.5l1.6 4-2 1.5a11.6 11.6 0 0 0 5.8 5.8l1.5-2 4 1.6v2.5a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 4.2 5.8a2 2 0 0 1 2-2.2Z"/>');
  ic("adduser", '<circle cx="10" cy="8.4" r="3.7"/><path d="M3.6 20.2a6.6 6.6 0 0 1 12.8 0"/><path d="M18.4 8.4v5.2M15.8 11h5.2"/>');
  ic("collect", '<path d="M12 4.4l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1L4.5 9.9l5.2-.8Z"/>');
  ic("moon", '<path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.5 8.5 0 1 0 10.4 10.4Z"/>');
  ic("sun", '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.4M12 19v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.6 12H5M19 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7"/>');
  ic("skin", '<path d="M12 3.4 4 8v8l8 4.6L20 16V8Z"/><path d="M4 8l8 4.6L20 8M12 12.6v8"/>');
  ic("min", '<path d="M5 12h14"/>');
  ic("max", '<rect x="5.4" y="5.4" width="13.2" height="13.2" rx="1.4"/>');
  ic("close", '<path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>');
  ic("chevdown", '<path d="m7 10 5 5 5-5"/>');
  ic("chevright", '<path d="m10 7 5 5-5 5"/>');
  ic("pin", '<path d="M9 3.6h6l-.7 5.2 3.5 3v1.6H6.2v-1.6l3.5-3Z"/><path d="M12 13.4v7"/>');
  ic("play", '<circle cx="12" cy="12" r="8.6"/><path d="M10.2 8.8 16 12l-5.8 3.2Z" fill="currentColor" stroke="none"/>');
  ic("play-tri", '<path d="M8.2 5.4 18.6 12 8.2 18.6Z" fill="currentColor" stroke="none"/>');
  ic("expand", '<path d="M9 3.8H3.8V9M15 3.8h5.2V9M9 20.2H3.8V15M15 20.2h5.2V15"/>');
  ic("shrink", '<path d="M3.8 9H9V3.8M20.2 9H15V3.8M3.8 15H9v5.2M20.2 15H15v5.2"/>');
  ic("export", '<path d="M14 4.6h5.4V10"/><path d="M19.4 4.6 11 13"/><path d="M19.4 13.6v4.4a1.8 1.8 0 0 1-1.8 1.8H6.2a1.8 1.8 0 0 1-1.8-1.8V6.8A1.8 1.8 0 0 1 6.2 5h4.4"/>');
  ic("wall", '<rect x="3.2" y="4.4" width="17.6" height="12" rx="2"/><path d="M8.4 19.6h7.2M12 16.4v3.2"/>');
  ic("wall-off", '<rect x="3.2" y="4.4" width="17.6" height="12" rx="2"/><path d="M8.4 19.6h7.2M12 16.4v3.2M8.6 7.6l6.8 5.6M15.4 7.6l-6.8 5.6"/>');
  ic("comment", '<path d="M20.4 14.6a2.6 2.6 0 0 1-2.6 2.6H9.6L4.2 20.4V6.6a2.6 2.6 0 0 1 2.6-2.6h11a2.6 2.6 0 0 1 2.6 2.6Z"/>');
  ic("group", '<circle cx="9" cy="9" r="3.2"/><path d="M3.4 19.4a5.6 5.6 0 0 1 11.2 0"/><circle cx="17" cy="10.4" r="2.6"/><path d="M15.2 16.2a4.8 4.8 0 0 1 5.4 3.2"/>');
  ic("cloud", '<path d="M7.4 18.4h9.2a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10-1.2 3.6 3.6 0 0 0 .4 8.4Z"/>');
  ic("wiki", '<path d="M4.6 5.4h6.2a2.6 2.6 0 0 1 2.6 2.6v11a2 2 0 0 0-2-2H4.6Z"/><path d="M19.4 5.4h-3.4a2.6 2.6 0 0 0-2.6 2.6v11a2 2 0 0 1 2-2h4Z"/>');
  ic("task", '<rect x="3.6" y="4.6" width="16.8" height="15.2" rx="2.2"/><path d="M7.6 9.6h8.8M7.6 14.4h5.6"/>');
  ic("people", '<circle cx="12" cy="8.2" r="3.8"/><path d="M4.6 20.2a7.4 7.4 0 0 1 14.8 0"/>');
  ic("project", '<rect x="3.6" y="5.4" width="7" height="13.2" rx="1.8"/><rect x="13.4" y="5.4" width="7" height="8" rx="1.8"/>');
  ic("disk", '<path d="M4.6 6.6A2 2 0 0 1 6.6 4.6h10.8a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="12" r="3.2"/>');
  ic("apps", '<circle cx="7" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="17" r="1.6" fill="currentColor" stroke="none"/>');
  ic("spark", '<path d="M12 3.4 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9Z"/>');
  ic("check", '<path d="m5 12.6 4.6 4.6L19 6.6"/>');
  ic("sort", '<path d="M4 7.4h16M6.6 12h10.8M9.4 16.6h5.2"/>');
  ic("quote", '<path d="M9.4 6.6H6a1.6 1.6 0 0 0-1.6 1.6v3.2A1.6 1.6 0 0 0 6 13h2a1.6 1.6 0 0 1 1.6 1.6v.6A1.6 1.6 0 0 1 8 16.8H6.4"/><path d="M19.6 6.6h-3.4a1.6 1.6 0 0 0-1.6 1.6v3.2A1.6 1.6 0 0 0 16.2 13h2a1.6 1.6 0 0 1 1.6 1.6v.6a1.6 1.6 0 0 1-1.6 1.6h-1.6"/>');
  ic("back", '<path d="M15 5.4 8.4 12l6.6 6.6"/>');
  ic("forward", '<path d="m9 5.4 6.6 6.6L9 18.6"/>');
  ic("quote-reply", '<path d="M9 8.4 4.6 12.6 9 16.8"/><path d="M4.6 12.6h9.2a5.8 5.8 0 0 1 5.8 5.8v1.2"/>');
  ic("camera", '<path d="M4.4 8.4h2.8l1.4-2h6.8l1.4 2h2.8a1.8 1.8 0 0 1 1.8 1.8v7.2a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8v-7.2a1.8 1.8 0 0 1 1.8-1.8Z"/><circle cx="12" cy="13.6" r="3"/>');
  ic("send", '<path d="M20.6 3.4 3.6 10.6l6.9 2.5 2.5 6.9Z"/><path d="m10.5 13.1 4.6-4.6"/>');
  // ======================= 2.5 伪装：标签页标题 / 图标 / 右键菜单 =======================
  // 目标：浏览器的标签页标题、图标、右键菜单都不能露出「B站 / 哔哩哔哩」。
  // 做法：重定义 document.title 的 getter/setter 拦住站内 SPA 的改写，配上 MutationObserver 兜底。
  // 更狠的一招：给站点脚本塞一个假名字。标题多半是「$O.NAME_zh + "..."」拼出来的，
  // 站点自己的变量被改了，就算它绕过 setter 直接写 <title> 节点，也拼不出带品牌名的文字。
  var DEFAULT_TITLE = "云枢科技 · 钉钉";
  var rawDesc = null;
  try { rawDesc = Object.getOwnPropertyDescriptor(Document.prototype, "title"); } catch (e) { rawDesc = null; }
  // 注意：这几个正则不能带中文反引号 / 反斜杠以外的转义坑，写错会连累整段模板字符串
  var MASKS = [
    [/bilibili/gi, "云枢科技"],
    [/[哔哩]*哩哔哩/g, "云枢科技"],
    [/B站/g, "云枢科技"],
    [/视频播放器/g, "会议室"],
    [/视频播放/g, "会议记录"]
  ];

  function appTitle() {
    var t = String(lsGet(LS.title, "") || "").trim();
    if (t) return t;
    var label = (typeof SKINS !== "undefined" && SKINS[SKIN_ID] && SKINS[SKIN_ID].label) || "钉钉";
    return "云枢科技 · " + label;
  }
  function setAppTitle(t) {
    var text = String(t || "").trim();
    if (text) lsSet(LS.title, text);
    else { try { localStorage.removeItem(LS.title); } catch (e) { /* ignore */ } }
    syncTitle(true);
    if (el.root) {
      el.root.setAttribute("data-title", appTitle());
      var tb = el.root.querySelector(".im-tb-apptitle");
      if (tb) tb.textContent = appTitle();
    }
  }
  function maskTitle(s) {
    s = String(s == null ? "" : s);
    for (var i = 0; i < MASKS.length; i++) s = s.replace(MASKS[i][0], MASKS[i][1]);
    return s;
  }
  function syncTitle(force) {
    if (!rawDesc || !rawDesc.get) return;
    var want = appTitle();
    try {
      if (force || rawDesc.get.call(document) !== want) rawDesc.set.call(document, want);
    } catch (e) { /* ignore */ }
  }
  // 站点脚本里存站名的全局变量（B站是 window.$O.NAME_zh / NAME）
  function maskBrandGlobals() {
    try {
      var o = window.$O;
      if (o && typeof o === "object") {
        if (typeof o.NAME_zh === "string") o.NAME_zh = "云枢科技";
        if (typeof o.NAME === "string") o.NAME = "云枢科技";
      }
    } catch (e) { /* ignore */ }
  }
  // 站内 SPA 会直接 document.title = "xxx_哔哩哔哩_bilibili"：重定义 getter/setter 统一改写
  function installTitleGuard() {
    if (!rawDesc || !rawDesc.get || !rawDesc.set) return;
    try {
      Object.defineProperty(document, "title", {
        configurable: true,
        enumerable: true,
        get: function () { return maskTitle(rawDesc.get.call(document)); },
        set: function (v) {
          var s = String(v == null ? "" : v);
          try {
            if (rawDesc.get.call(document) === s) return;
            rawDesc.set.call(document, s);
          } catch (e) { /* ignore */ }
          syncTitle();
        }
      });
    } catch (e) { /* ignore */ }
  }
  function installTitleObserver() {
    if (typeof MutationObserver !== "function") return;
    var head = document.head || document.documentElement;
    if (!head) return;
    try {
      new MutationObserver(function () {
        syncTitle();
        maskBrandGlobals();
      }).observe(head, { childList: true, subtree: true, characterData: true });
    } catch (e) { /* ignore */ }
  }
  // 右键菜单：把「复制视频地址 / 统计信息 / 检查元素」里的品牌字样盖掉
  // 皮肤临时关闭时不拦右键，否则原站和登录页的正常操作会受影响。
  function installContextMenuGuard() {
    if (MOCK) return;
    document.addEventListener("contextmenu", function (e) {
      if (typeof SKIN_OFF !== "undefined" && SKIN_OFF) return;
      if (e.target.closest && e.target.closest("#biliding-root")) return;
      e.preventDefault();
    }, true);
  }
  // ======================= 3. 皮肤配置 =======================
  // 三套皮肤：钉钉 8.x / 飞书 IM / 企业微信 5.x。
  // 结构差异用 layout 标记，配色走 CSS 里的 [data-skin=...] 变量块。
  var SKINS = {
    dingtalk: {
      id: "dingtalk",
      label: "钉钉",
      org: "云枢科技",
      titlebar: true,
      rail: true,
      nav2: true,
      strip: false,
      listHeader: "chips",
      listNav: ["消息", "置顶", "单聊", "群聊", "我创建的", "小分组"],
      railItems: [
        { k: "msg", icon: "msg", label: "消息", badge: true, on: true },
        { k: "notify", icon: "bell", label: "通知" },
        { k: "dm", icon: "mail", label: "私信" },
        { k: "mark", icon: "bookmark", label: "书签" },
        { k: "chat", icon: "chat", label: "聊天" },
        { k: "doc", icon: "doc", label: "文档", dot: true },
        { k: "aitable", icon: "table", label: "AI表格" },
        { k: "aimic", icon: "mic", label: "AI听记" },
        { k: "work", icon: "grid", label: "工作台" },
        { k: "book", icon: "book", label: "通讯录" },
        { k: "meet", icon: "video", label: "会议" },
        { k: "cal", icon: "cal", label: "日历" },
        { k: "todo", icon: "todo", label: "待办", badge: true },
        { k: "add", icon: "plus", label: "添加" }
      ],
      composer: {
        toolbar: ["bold", "italic", "underline", "strike", "olist", "list", "link", "image", "code"],
        tools: ["smile", "thumb", "at", "font", "scissors", "folder", "plus"],
        placeholder: "请输入消息",
        hint: "Enter/Alt+S 发送，Ctrl+Enter换行",
        chips: ["看待办", "看忙碌"]
      }
    },
    feishu: {
      id: "feishu",
      label: "飞书",
      org: "云枢科技",
      titlebar: true,
      rail: true,
      nav2: false,
      strip: true,
      listHeader: "chips",
      listNav: ["消息", "未读"],
      railItems: [
        { k: "msg", icon: "msg", label: "消息", badge: true, on: true },
        { k: "cal", icon: "cal", label: "日历" },
        { k: "work", icon: "grid", label: "工作台" },
        { k: "cloud", icon: "cloud", label: "云文档" },
        { k: "wiki", icon: "wiki", label: "知识库" },
        { k: "task", icon: "task", label: "任务" },
        { k: "book", icon: "book", label: "联系人" },
        { k: "project", icon: "project", label: "项目" },
        { k: "more", icon: "more", label: "更多" }
      ],
      composer: {
        toolbar: ["bold", "italic", "underline", "strike", "code", "olist", "list", "quote", "link", "image", "smile", "at"],
        tools: [],
        placeholder: "发送消息…",
        hint: "输入内容后按 Enter 发送",
        chips: []
      }
    },
    wecom: {
      id: "wecom",
      label: "企业微信",
      org: "云枢科技",
      titlebar: true,
      rail: true,
      nav2: false,
      strip: false,
      listHeader: "plain",
      listNav: ["未读", "@我", "单聊", "群聊", "内部聊天", "外部聊天", "标记"],
      railItems: [
        { k: "msg", icon: "msg", label: "消息", badge: true, on: true },
        { k: "notify", icon: "bell", label: "通知" },
        { k: "dm", icon: "mail", label: "私信" },
        { k: "mark", icon: "bookmark", label: "书签" },
        { k: "chat", icon: "chat", label: "聊天" },
        { k: "smartdoc", icon: "doc", label: "智能文档", dot: true },
        { k: "summary", icon: "spark", label: "智能总结" },
        { k: "work", icon: "grid", label: "工作台" },
        { k: "book", icon: "book", label: "通讯录" },
        { k: "disk", icon: "disk", label: "微盘" },
        { k: "apps", icon: "apps", label: "高级功能" }
      ],
      composer: {
        toolbar: ["bold", "italic", "underline", "strike", "code", "olist", "list", "quote", "link", "image", "smile", "at"],
        tools: [],
        placeholder: "输入消息",
        hint: "Enter 发送，Ctrl+Enter 换行",
        chips: []
      }
    }
  };
  var SKIN_ORDER = ["dingtalk", "feishu", "wecom"];

  function currentSkinId() {
    var v = lsGet(LS.skin, "dingtalk");
    return SKINS[v] ? v : "dingtalk";
  }
  var SKIN_ID = currentSkinId();
  function skin() { return SKINS[SKIN_ID]; }

  // 站点脚本一开始跑就会把标题改回「…_哔哩哔哩_bilibili」，所以这里立刻装上拦截
  // （MOCK 预览页不改标题）
  installTitleGuard();
  syncTitle(true);

  // ======================= 4. 频道定义（B站分区 → 群聊） =======================
  var CHANNELS = [
    { rid: 0, key: "rcmd", label: "推荐", group: "推荐流", avatar: "推", color: "#1A87FF", kind: "home" },
    { rid: 0, key: "hot", label: "热门", group: "热门榜单", avatar: "热", color: "#FF6B35", api: "popular" },
    { rid: 1, key: "douga", label: "动画", group: "动画交流群", avatar: "动", color: "#FF6699" },
    { rid: 36, key: "knowledge", label: "知识", group: "知识充电站", avatar: "知", color: "#4D8DFF" },
    { rid: 188, key: "tech", label: "科技", group: "科技数码群", avatar: "科", color: "#12B5CB" },
    { rid: 3, key: "music", label: "音乐", group: "音乐广场", avatar: "音", color: "#9B5DE5" },
    { rid: 4, key: "game", label: "游戏", group: "游戏开黑群", avatar: "游", color: "#00C56C" },
    { rid: 5, key: "ent", label: "娱乐", group: "娱乐圈茶馆", avatar: "娱", color: "#FF9A3D" },
    { rid: 211, key: "food", label: "美食", group: "美食探店群", avatar: "食", color: "#E8A33D" },
    { rid: 160, key: "life", label: "生活", group: "生活百宝箱", avatar: "生", color: "#31C48D" },
    { rid: 181, key: "film", label: "影视", group: "影视追剧群", avatar: "影", color: "#5B6EF5" },
    { rid: 138, key: "dance", label: "舞蹈", group: "舞蹈练习室", avatar: "舞", color: "#F45B9A" },
    { rid: 119, key: "kichiku", label: "鬼畜", group: "鬼畜素材库", avatar: "鬼", color: "#7C5CFF" },
    { rid: 155, key: "fashion", label: "时尚", group: "穿搭分享群", avatar: "时", color: "#FF5C8A" },
    { rid: 202, key: "car", label: "汽车", group: "车友会", avatar: "车", color: "#3E7BFA" },
    { rid: 234, key: "sports", label: "运动", group: "体育馆", avatar: "体", color: "#2FA84F" },
    { rid: 13, key: "anime", label: "番剧", group: "番剧追更群", avatar: "番", color: "#FF7A45", api: "newlist" },
    { rid: 177, key: "documentary", label: "纪录片", group: "纪录片放映厅", avatar: "纪", color: "#4A5568", api: "newlist" }
  ];
  function channelByKey(key) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].key === key) return CHANNELS[i];
    return null;
  }
  function channelById(rid) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].rid === Number(rid)) return CHANNELS[i];
    return null;
  }

  // 分组栏（钉钉/企微左二栏）里挂的「我创建的」分组树：把 B站分区按主题分桶
  // 分组名全部虚构，不含任何真实客户 / 项目 / 同事信息。
  var NAV2_GROUPS = [
    { name: "前装一期", keys: ["car", "tech", "sports"] },
    { name: "小分组", keys: ["documentary", "film"] },
    { name: "客户甲", keys: ["knowledge", "music"] },
    { name: "工程机", keys: ["game", "douga"] },
    { name: "客户乙", keys: ["ent", "life"] },
    { name: "售后支持", keys: ["food", "fashion"] },
    { name: "临时组", keys: ["dance", "kichiku"] }
  ];

  // 首屏兜底会话（真实站也保留：让工作区看起来有人）
  // 人名 / 项目名 / 公司名全部虚构，仅用于撑起 IM 外观。
  var DECOY_CONVS = [
    { id: "sys:1", name: "【IPMT】QC-8 项目组", tag: "内部群", preview: "林望舒: 这版排期表你过一下，下周一前给结论…", time: "09:32", avatar: "Q", color: "#1A87FF", unread: 12, mute: true, members: 8 },
    { id: "sys:2", name: "鹰眼 2.0 算法计划（研发）", tag: "内部群", preview: "周砚: 撤回了一条消息", time: "09:12", avatar: "Y", color: "#4D8DFF", unread: 3, mute: true, members: 24 },
    { id: "sys:3", name: "陈亦然", preview: "只有一台", time: "昨天", avatar: "亦", color: "#8A93A0", members: 0 },
    { id: "sys:4", name: "张与安", tag: "部门标签", preview: "因为这个题，所以我接了一个扩展坞", time: "昨天", avatar: "与", color: "#FF6B35", read: true, members: 0 },
    { id: "sys:5", name: "海外车队加装项目组", tag: "内部群", preview: "祁远: 叠加之前核对过，后天我会再次复核…", time: "昨天", avatar: "海", color: "#00C56C", unread: 17, mute: true, members: 12 },
    { id: "sys:6", name: "罗一川,许星野,唐声远", tag: "外部群", preview: "罗一川: OK 等会给测试送过去", time: "周一", avatar: "罗", color: "#12B5CB", members: 36 }
  ];

  // ======================= 5. 状态 =======================
  var state = {
    activeRail: "msg",
    activeConv: "conv:rcmd",
    activeNav2: "消息",
    convCache: {},
    unread: {},
    listFilter: "all",
    listQuery: "",
    dark: lsGet(LS.dark, "0") === "1",
    blur: lsGet(LS.blur, "0") === "1",
    playerDef: null,
    playerW: 0,
    me: null,
    isLogin: false,
    messages: {}
  };
  // ======================= 6. 网络层 =======================
  var API = "https://api.bilibili.com";
  function fetchJson(url) {
    if (MOCK) {
      var hit = (MOCK.handle && MOCK.handle(url)) || null;
      return Promise.resolve(hit || { code: 0, data: {} });
    }
    return fetch(url, { credentials: "include", headers: { "Referer": location.origin + "/" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
  }
  function fetchJ(url) {
    return fetchJson(url).then(function (j) {
      if (!j || j.code !== 0) throw new Error((j && j.message) || "接口返回异常");
      return j.data;
    });
  }
  // 推荐流：wbi/index 接口需要签名，失败自动降级热门
  function apiRcmd(idx) {
    return fetchJ(API + "/x/web-interface/wbi/index/top/feed/rcmd?ps=12&fresh_type=3&fresh_idx=" + (idx || 1) + "&feed_version=V8&homepage_ver=1&scrl_mid=0&brush=" + (idx || 1))
      .then(function (d) { return normalizeFeed(d.item || []); })
      .catch(function () { return apiPopular(1); });
  }
  function apiPopular(pn) {
    return fetchJ(API + "/x/web-interface/popular?ps=20&pn=" + (pn || 1))
      .then(function (d) { return normalizeFeed(d.list || []); });
  }
  function apiRegion(rid, pn) {
    return fetchJ(API + "/x/web-interface/newlist?rid=" + rid + "&ps=20&pn=" + (pn || 1) + "&type=0")
      .then(function (d) { return normalizeFeed(d.archives || []); });
  }
  function apiView(bvid) {
    return fetchJ(API + "/x/web-interface/view?bvid=" + encodeURIComponent(bvid));
  }
  function apiReplies(aid, pn) {
    return fetchJ(API + "/x/v2/reply?type=1&oid=" + aid + "&sort=2&ps=20&pn=" + (pn || 1) + "&nohot=0")
      .then(function (d) { return { replies: d.replies || [], page: d.page || {} }; });
  }
  function apiSearch(kw) {
    return fetchJ(API + "/x/web-interface/search/type?search_type=video&keyword=" + encodeURIComponent(kw) + "&page=1")
      .then(function (d) { return normalizeFeed(d.result || [], true); });
  }

  function normalizeFeed(list, isSearch) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i] || {};
      if (!it.bvid && !it.aid) continue;
      var title = stripText(it.title);
      if (!title) continue;
      out.push({
        bvid: it.bvid || "",
        aid: it.aid || 0,
        title: title,
        pic: toHttp(it.pic),
        dur: it.duration || 0,
        owner: (it.owner && it.owner.name) || it.author || "UP主",
        face: toHttp((it.owner && it.owner.face) || ""),
        view: (it.stat && it.stat.view) || it.play || 0,
        like: (it.stat && it.stat.like) || it.like || 0,
        danmaku: (it.stat && it.stat.danmaku) || it.video_review || 0,
        pubdate: it.pubdate || it.senddate || 0,
        tname: it.tname || (isSearch ? stripText(it.typename) : "") || "",
        raw: it
      });
    }
    return out;
  }

  // ======================= 7. 路由解析 =======================
  function parseRoute() {
    if (MOCK && MOCK.route) return MOCK.route;
    var p = location.pathname, m;
    if (HOST === "search.bilibili.com") {
      var kw = new URLSearchParams(location.search).get("keyword") || "";
      return { kind: "search", key: "search", keyword: kw };
    }
    m = p.match(/^\/video\/(BV[0-9A-Za-z]+|av\d+)/i);
    if (m) {
      var id = m[1];
      return {
        kind: "video", key: "video",
        bvid: /^av/i.test(id) ? null : id,
        av: /^av/i.test(id) ? Number(id.slice(2)) : 0,
        page: Number(new URLSearchParams(location.search).get("p") || 1)
      };
    }
    m = p.match(/^\/(anime|guochuang|variety|movie|tv|documentary|music|dance|game|knowledge|tech|food|life|ent|car|fashion|kichiku|douga|sports|v)\/?/i);
    if (m) {
      var ch = channelByKey(m[1].toLowerCase());
      if (ch) return { kind: "region", key: "region", channel: ch };
    }
    if (p === "/" || p === "" || p.indexOf("/index") === 0) return { kind: "home", key: "home" };
    if (p.indexOf("/popular") === 0) return { kind: "popular", key: "popular" };
    return { kind: "home", key: "home" };
  }

  // ======================= 8. favicon =======================
  // 用内联 SVG 画一个 IM 图标：不联网、不出现任何 B站素材，样式跟随皮肤主色。
  var SKIN_FAVICON = {
    dingtalk: { bg: ["#33AAF8", "#0E6EE6"], glyph: "钉" },
    feishu: { bg: ["#3370FF", "#1A56E8"], glyph: "飞" },
    wecom: { bg: ["#2A8AFF", "#1769D2"], glyph: "企" }
  };
  function paintFavicon() {
    var cfg = SKIN_FAVICON[SKIN_ID] || SKIN_FAVICON.dingtalk;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + cfg.bg[0] + '"/><stop offset="1" stop-color="' + cfg.bg[1] + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="64" height="64" rx="14" fill="url(#b)"/>' +
      '<text x="32" y="34" text-anchor="middle" dominant-baseline="middle" fill="#fff" ' +
      'font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="700">' + cfg.glyph + '</text>' +
      '</svg>';
    var uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    var link = document.getElementById(FAVICON_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = FAVICON_ID; link.rel = "icon"; link.type = "image/svg+xml";
      (document.head || document.documentElement).appendChild(link);
    }
    link.setAttribute("href", uri);
    // 站内自带的图标（含 apple-touch-icon）一律降级，避免浏览器回退到 B站图标
    var old = document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]');
    for (var i = 0; i < old.length; i++) {
      if (old[i].id === FAVICON_ID) continue;
      old[i].setAttribute("rel", "alternate-icon");
      old[i].setAttribute("href", uri);
    }
  }
  // ======================= 9. 样式（公共骨架） =======================
  var CSS_CORE = String.raw`
  @keyframes bd-fade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
  @keyframes bd-spin { to { transform: rotate(360deg); } }
  html.im-theme { color-scheme: light; }
  html.im-theme body {
    margin: 0 !important; padding: 0 !important; overflow: hidden !important;
    background: #EDEFF5 !important;
    font-family: "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    -webkit-font-smoothing: antialiased;
  }
  /* 隐藏原站页面：用 visibility:hidden 而不是 display:none（B站脚本会读元素尺寸，display:none 会抛错）。
     浮层（皮肤菜单 / 尺寸菜单 / 标题框）必须显式放行，否则会被这条规则一起藏掉。 */
  html.im-theme body > *:not(#biliding-root):not(script):not(style):not(.im-toast-wrap):not(.im-skin-menu):not(.bd-size-menu):not(.bd-title-dlg):not(.bd-login-dlg):not(.bd-restore-btn) {
    visibility: hidden !important; pointer-events: none !important;
  }

  /* ---------- 外壳栅格 ---------- */
  .im-shell { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    font-size: 13px; color: var(--c-text); background: var(--c-bg); }
  .im-shell *, .im-shell *::before, .im-shell *::after { box-sizing: border-box; }
  .im-shell button { font-family: inherit; }
  .im-body { flex: 1 1 auto; display: flex; min-height: 0; }

  /* 通用滚动条 */
  .im-shell ::-webkit-scrollbar { width: 8px; height: 8px; }
  .im-shell ::-webkit-scrollbar-thumb { background: rgba(17,24,39,.14); border-radius: 4px; }
  .im-shell ::-webkit-scrollbar-thumb:hover { background: rgba(17,24,39,.24); }
  .im-shell ::-webkit-scrollbar-track { background: transparent; }

  /* ---------- 顶栏 ---------- */
  .im-titlebar { flex: 0 0 auto; height: var(--h-title); display: flex; align-items: center;
    gap: 12px; padding: 0 10px 0 14px; background: var(--c-title); border-bottom: 1px solid var(--c-title-line);
    user-select: none; position: relative; z-index: 20; }
  .im-tb-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 1 auto; }
  .im-me { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; flex: 0 0 26px; cursor: pointer; position: relative; }
  .im-me img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .im-me .ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg,#FFB84D,#FF8A3D); color: #fff; font-size: 12px; font-weight: 600; }
  .im-tb-status { font-size: 12.5px; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
  .im-tb-status b { font-weight: 500; color: var(--c-text); }
  .im-tb-status .song { color: var(--c-text3); }
  /* 顶栏标题：直接用标签页标题，改标题时这里同步变 */
  .im-tb-apptitle { font-size: 13px; font-weight: 600; color: var(--c-text); letter-spacing: .2px;
    padding: 0 2px; cursor: default; user-select: none; }
  .im-tb-apptitle:hover { color: var(--c-accent); }
  .im-tb-center { flex: 1 1 auto; display: flex; justify-content: center; min-width: 0; }
  .im-tb-search { width: min(520px, 100%); height: 26px; display: flex; align-items: center; gap: 6px;
    padding: 0 12px; border-radius: 13px; background: var(--c-search); border: 1px solid transparent;
    color: var(--c-text3); cursor: text; transition: border-color .15s, background .15s; }
  .im-tb-search:hover { border-color: var(--c-line); }
  .im-tb-search svg { width: 14px; height: 14px; flex: 0 0 14px; }
  .im-tb-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
    font-size: 12.5px; color: var(--c-text); font-family: inherit; height: 100%; }
  .im-tb-search input::placeholder { color: var(--c-text3); }
  .im-tb-right { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
  .im-win { width: 30px; height: 26px; border: 0; background: transparent; color: var(--c-text2);
    border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .im-win svg { width: 14px; height: 14px; }
  .im-win:hover { background: var(--c-hover); color: var(--c-text); }
  .im-win.close:hover { background: #E81123; color: #fff; }
  .im-tb-sep { width: 1px; height: 16px; background: var(--c-line); margin: 0 4px; }

  /* ---------- 左一：导航 rail ---------- */
  .im-rail { flex: 0 0 var(--w-rail); width: var(--w-rail); background: var(--c-rail);
    display: flex; flex-direction: column; user-select: none; position: relative; z-index: 15; }
  .im-org { display: flex; align-items: center; gap: 8px; padding: 12px 12px 10px; cursor: pointer; }
  .im-org-logo { width: 30px; height: 30px; border-radius: 8px; flex: 0 0 30px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; background: #fff; color: var(--c-accent);
    font-size: 13px; font-weight: 700; }
  .im-org-logo img { width: 100%; height: 100%; object-fit: cover; }
  .im-org-meta { min-width: 0; flex: 1; }
  .im-org-name { font-size: 12.5px; font-weight: 600; color: var(--c-text); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; }
  .im-org-sub { font-size: 11px; color: var(--c-text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-org svg { width: 12px; height: 12px; color: var(--c-text3); flex: 0 0 12px; }
  .im-rail-nav { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 2px 0 8px; }
  .im-rail-item { width: calc(100% - 16px); margin: 1px 8px; height: 40px; border: 0; border-radius: 8px;
    background: transparent; color: var(--c-text); display: flex; align-items: center; gap: 10px;
    padding: 0 10px; font-size: 13px; cursor: pointer; position: relative; text-align: left;
    transition: background .12s ease, color .12s ease; }
  .im-rail-item svg { width: 18px; height: 18px; flex: 0 0 18px; color: var(--c-text2); }
  .im-rail-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-rail-item:hover { background: var(--c-hover-rail); }
  .im-rail-item.on { background: var(--c-rail-on); color: var(--c-accent); font-weight: 500; }
  .im-rail-item.on svg { color: var(--c-accent); }
  .im-rail-item .dot { width: 6px; height: 6px; border-radius: 50%; background: #FF4D4F; flex: 0 0 6px; }
  .im-rail-item .bd-badge { position: static; flex: 0 0 auto; }
  .im-rail-group-title { font-size: 11.5px; color: var(--c-text3); padding: 10px 18px 4px; }
  .im-rail-sec { border-top: 1px solid var(--c-line-weak); margin: 6px 8px 0; padding-top: 4px; }
  .im-rail-tail { padding: 6px 8px 8px; display: flex; flex-direction: column; gap: 1px; }
  .im-rail-tail .im-rail-item { height: 34px; font-size: 12.5px; color: var(--c-text2); }
  .im-rail-tail .im-rail-item svg { width: 16px; height: 16px; flex: 0 0 16px; }

  /* 徽标 */
  .bd-badge { min-width: 16px; height: 16px; padding: 0 5px; border-radius: 8px; background: #F5222D;
    color: #fff; font-size: 10px; font-weight: 500; line-height: 16px; text-align: center; display: inline-block;
    font-variant-numeric: tabular-nums; }

  /* ---------- 左二：分组栏（钉钉 / 企微） ---------- */
  .im-nav2 { flex: 0 0 var(--w-nav2); width: var(--w-nav2); background: var(--c-nav2);
    display: flex; flex-direction: column; min-height: 0; }
  .im-nav2-head { height: 46px; flex: 0 0 46px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 14px; }
  .im-nav2-head .t { font-size: 12.5px; color: var(--c-text2); flex: 1; }
  .im-nav2-list { flex: 1 1 auto; overflow-y: auto; padding: 2px 8px 10px; }
  .im-nav2-item { height: 34px; border-radius: 7px; display: flex; align-items: center; gap: 6px;
    padding: 0 10px; font-size: 13px; color: var(--c-text); cursor: pointer; position: relative; }
  .im-nav2-item:hover { background: var(--c-hover); }
  .im-nav2-item.on { background: var(--c-nav2-on); font-weight: 500; }
  .im-nav2-item .n { margin-left: auto; font-size: 11.5px; color: var(--c-text3); }
  .im-nav2-item .bd-badge { margin-left: auto; }
  .im-nav2-item .chev { width: 12px; height: 12px; color: var(--c-text3); margin-left: -2px; }
  .im-nav2-sub .im-nav2-item { height: 32px; font-size: 12.5px; color: var(--c-text2); padding-left: 26px; }
  .im-nav2-sub .im-nav2-item.on { color: var(--c-text); }
  .im-nav2-foot { flex: 0 0 auto; padding: 6px 8px 8px; }

  /* ---------- 飞书 strip（48px 图标条） ---------- */
  .im-strip { flex: 0 0 var(--w-strip); width: var(--w-strip); background: var(--c-panel);
    border-right: 1px solid var(--c-line-weak); display: flex; flex-direction: column;
    align-items: center; gap: 4px; padding: 10px 0; }
  .im-strip-item { width: 34px; height: 34px; border: 0; border-radius: 8px; background: transparent;
    color: var(--c-text2); display: flex; align-items: center; justify-content: center; cursor: pointer;
    position: relative; padding: 0; }
  .im-strip-item svg { width: 19px; height: 19px; }
  .im-strip-item:hover { background: var(--c-hover); }
  .im-strip-item.on { background: var(--c-accent-weak); color: var(--c-accent); }
  .im-strip-item .bd-badge { position: absolute; top: -2px; right: -4px; transform: scale(.86); }
  .im-strip-sp { flex: 1; }

  /* ---------- 会话列表 ---------- */
  .im-list { flex: 0 0 var(--w-list); width: var(--w-list); background: var(--c-list);
    display: flex; flex-direction: column; min-height: 0; position: relative;
    border-right: 1px solid var(--c-line-weak); }
  .im-list-head { flex: 0 0 auto; height: 46px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 14px; }
  .im-list-title { font-size: 15px; font-weight: 600; color: var(--c-text); flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-icon-btn { width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent;
    color: var(--c-text2); display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; padding: 0; flex: 0 0 auto; transition: background .12s, color .12s; }
  .im-icon-btn svg { width: 16px; height: 16px; }
  .im-icon-btn:hover { background: var(--c-hover); color: var(--c-text); }
  .im-icon-btn.on { background: var(--c-accent-weak); color: var(--c-accent); }

  .im-list-tabs { display: flex; align-items: center; gap: 4px; padding: 0 10px 8px; }
  .im-shell[data-list-header="chips"] .im-list-head { height: 40px; }
  .im-shell[data-list-header="chips"] .im-list-head .im-list-title { display: none; }
  .im-tab { height: 26px; padding: 0 12px; border-radius: 13px; border: 0; background: transparent;
    color: var(--c-text2); font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
  .im-tab:hover { background: var(--c-hover); }
  .im-tab.on { background: var(--c-tab-on); color: var(--c-tab-on-text); font-weight: 500; }
  .im-tab .n { font-size: 11.5px; opacity: .85; font-variant-numeric: tabular-nums; }
  .im-list-search { padding: 0 10px 8px; }
  .im-list-search .box { display: flex; align-items: center; gap: 6px; height: 30px; border-radius: 6px;
    background: var(--c-search); padding: 0 10px; color: var(--c-text3); border: 1px solid transparent; }
  .im-list-search .box:focus-within { border-color: var(--c-accent); background: var(--c-panel); }
  .im-list-search svg { width: 14px; height: 14px; flex: 0 0 14px; }
  .im-list-search input { border: 0; outline: 0; background: transparent; flex: 1; min-width: 0;
    font-size: 12.5px; color: var(--c-text); font-family: inherit; height: 100%; }

  .im-list-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 0 8px 12px; }
  .im-list-sec { font-size: 11.5px; color: var(--c-text3); padding: 10px 8px 4px; }
  .im-conv { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 8px;
    cursor: pointer; position: relative; transition: background .1s ease; }
  .im-conv:hover { background: var(--c-hover); }
  .im-conv.on { background: var(--c-conv-on); }
  .im-conv-av { width: 40px; height: 40px; border-radius: 8px; flex: 0 0 40px; position: relative;
    overflow: visible; display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 16px; font-weight: 600; background: var(--c-accent); }
  .im-conv-av .face { width: 100%; height: 100%; border-radius: 8px; overflow: hidden; display: block; }
  .im-conv-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .im-conv-av .corner { position: absolute; right: -3px; bottom: -3px; width: 16px; height: 16px;
    border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 9px; color: var(--c-text2); border: 1px solid var(--c-line); }
  .im-conv-badge { position: absolute; top: -5px; right: -6px; min-width: 17px; height: 17px; padding: 0 5px;
    border-radius: 9px; background: #F5222D; color: #fff; font-size: 10.5px; font-weight: 500;
    line-height: 17px; text-align: center; border: 1.5px solid var(--c-list); font-variant-numeric: tabular-nums; }
  .im-conv-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .im-conv-row1 { display: flex; align-items: center; gap: 6px; }
  .im-conv-name { font-size: 13.5px; color: var(--c-text); flex: 1; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-conv.on .im-conv-name { font-weight: 500; }
  .im-tag { flex: 0 0 auto; font-size: 10.5px; line-height: 15px; padding: 0 4px; border-radius: 3px;
    border: 1px solid var(--c-tag-line); color: var(--c-tag-text); background: var(--c-tag-bg); }
  .im-conv-time { flex: 0 0 auto; font-size: 11px; color: var(--c-text3); font-variant-numeric: tabular-nums; }
  .im-conv-row2 { display: flex; align-items: center; gap: 6px; }
  .im-conv-msg { flex: 1; min-width: 0; font-size: 12px; color: var(--c-text3);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-conv-msg em { font-style: normal; color: var(--c-text4); }
  .im-conv-mute { width: 13px; height: 13px; flex: 0 0 13px; color: var(--c-text4); }
  .im-list-empty { text-align: center; color: var(--c-text3); font-size: 12px; padding: 24px 8px; }
  .im-skel { height: 58px; border-radius: 8px; background: var(--c-hover); margin: 4px 0; opacity: .6; }

  /* ---------- 聊天区 ---------- */
  .im-chat { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; background: var(--c-chat);
    position: relative; }
  .im-chat-head { flex: 0 0 auto; height: 56px; display: flex; align-items: center; gap: 10px;
    padding: 0 14px; background: var(--c-chat-head); border-bottom: 1px solid var(--c-line-weak); z-index: 5; }
  .im-chat-head .av { width: 34px; height: 34px; border-radius: 8px; flex: 0 0 34px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 14px; }
  .im-chat-head .av img { width: 100%; height: 100%; object-fit: cover; }
  .im-chat-head .meta { min-width: 0; flex: 1; }
  .im-chat-head .name { display: flex; align-items: center; gap: 6px; font-size: 14.5px; font-weight: 600;
    color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-chat-head .name .im-tag { font-weight: 400; }
  .im-chat-head .sub { font-size: 11.5px; color: var(--c-text3); margin-top: 3px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; }
  .im-chat-head .acts { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
  /* 默认不横向滚动（否则播放器稍宽就在聊天区底部压出一条横向滚动条）；
     只有 JS 判定「播放器确实比聊天列宽」时才加 .has-wide-player 打开横向滚动 */
  .im-chat-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 14px 22px 8px; }
  .im-chat-body.has-wide-player { overflow-x: auto; }

  .im-daysep { text-align: center; margin: 12px 0 14px; }
  .im-daysep span { font-size: 11px; color: var(--c-text3); }

  .im-msg { display: flex; gap: 10px; margin-bottom: 14px; animation: bd-fade .16s ease both; }
  .im-msg .av { width: 32px; height: 32px; border-radius: 7px; flex: 0 0 32px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 13px; }
  .im-msg .av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .im-msg-main { min-width: 0; max-width: min(640px, 74%); display: flex; flex-direction: column;
    align-items: flex-start; gap: 4px; }
  .im-msg-meta { display: flex; align-items: baseline; gap: 8px; }
  .im-msg-author { font-size: 12px; color: var(--c-text2); }
  .im-msg-time { font-size: 11px; color: var(--c-text4); }
  .im-bubble { background: var(--c-bubble-you); border: 1px solid var(--c-bubble-line);
    border-radius: var(--r-bubble); padding: 8px 11px; font-size: 13.5px; line-height: 1.6;
    color: var(--c-text); word-break: break-word; max-width: 100%; }
  .im-msg.me { flex-direction: row-reverse; }
  .im-msg.me .im-msg-main { align-items: flex-end; }
  .im-msg.me .im-bubble { background: var(--c-bubble-me); border-color: transparent; }
  .im-msg.me .im-msg-meta { flex-direction: row-reverse; }
  .im-read { font-size: 10.5px; color: var(--c-text4); margin-top: -1px; }
  .im-bubble a { color: var(--c-accent); text-decoration: none; }
  .im-bubble .bd-quote { border-left: 3px solid var(--c-line); padding: 2px 0 2px 8px; color: var(--c-text3);
    font-size: 12px; margin-bottom: 6px; }
  .im-bubble .bd-at { color: var(--c-accent); }
  .im-bubble img.emoji { width: 18px; height: 18px; vertical-align: -3px; }
  .im-reply-link { font-size: 11.5px; color: var(--c-accent); cursor: pointer; margin-top: 2px; }
  .im-reply-link:hover { text-decoration: underline; }

  /* 群消息聚合头像（钉钉多人会话头像） */
  .im-av-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
    width: 100%; height: 100%; gap: 1px; background: var(--c-line); border-radius: 8px; overflow: hidden; }
  .im-av-grid span { display: flex; align-items: center; justify-content: center; font-size: 9px;
    color: #fff; background: var(--c-accent); }

  /* 视频卡片（群里分享的视频） */
  .bd-card { background: var(--c-card); border-radius: 10px; overflow: hidden; border: 1px solid var(--c-line);
    width: min(430px, 100%); cursor: pointer; transition: box-shadow .16s ease, transform .16s ease; }
  .bd-card:hover { box-shadow: 0 6px 20px rgba(17,24,39,.1); transform: translateY(-1px); }
  .bd-card-thumb { position: relative; width: 100%; aspect-ratio: 16 / 9; background: var(--c-panel2); overflow: hidden; }
  .bd-card-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bd-card-thumb .dur { position: absolute; right: 6px; bottom: 6px; font-size: 10.5px; color: #fff;
    background: rgba(0,0,0,.58); border-radius: 3px; padding: 1px 4px; }
  .bd-card-thumb .play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    opacity: 0; background: rgba(0,0,0,.16); transition: opacity .16s ease; }
  .bd-card-thumb .play svg { width: 42px; height: 42px; color: #fff; }
  .bd-card:hover .bd-card-thumb .play { opacity: 1; }
  .bd-card-body { padding: 9px 11px 10px; }
  .bd-card-title { font-size: 13px; line-height: 1.5; color: var(--c-text); font-weight: 500;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .bd-card-foot { display: flex; align-items: center; gap: 8px; margin-top: 7px; font-size: 11.5px; color: var(--c-text3); }
  .bd-card-foot .up { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .bd-card-foot .up img { width: 14px; height: 14px; border-radius: 50%; }
  .bd-card-foot .up span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
  .bd-card-foot .sp { flex: 1; }

  /* 播放器贴片（宽度可调，见 JS 里的 bindPlayerResize）：
     宽度写到 .im-shell 的 --bd-player-w 上，气泡/消息容器跟着一起放，才能「放大」而不是被 760px 裁掉 */
  .bd-player { width: min(var(--bd-player-w, 720px), 100%); aspect-ratio: 16 / 9;
    border-radius: 8px; overflow: hidden; background: #000; position: relative; }
  /* 拖过手柄后按用户给的宽高走，不再被 16:9 锁住（变量默认值与预设都由 JS 写） */
  .bd-player.sized { aspect-ratio: auto; height: var(--bd-player-h, auto); }
  .bd-player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .bd-player-main { position: absolute; inset: 0; background: #000; }
  /* 浮窗：脱离聊天流，浮在整页之上，位置由 JS 写 left/top；拖顶部把手移动 */
  .bd-player.float { position: fixed !important; z-index: 10000; margin: 0 !important;
    box-shadow: 0 18px 48px rgba(0,0,0,.45); resize: none; }
  .bd-player.float .bd-player-hint { display: none; }
  .bd-player-bar { display: none; }
  .bd-player.float .bd-player-bar { position: absolute; left: 0; right: 0; top: 0; height: 28px; z-index: 7;
    display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 6px 0 10px;
    background: linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,0)); color: rgba(255,255,255,.86);
    font-size: 11.5px; cursor: move; touch-action: none; user-select: none; }
  .bd-player.float .bd-player-bar .t { pointer-events: none; }
  .bd-player.float .bd-player-tools { opacity: 1; }
  /* 右下角拖拽手柄 + 角上个「放大 / 全屏」按钮 */
  .bd-player-grip { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; z-index: 4;
    cursor: nwse-resize; touch-action: none;
    background: linear-gradient(135deg, transparent 46%, rgba(255,255,255,.72) 46%, rgba(255,255,255,.72) 54%,
      transparent 54%, transparent 68%, rgba(255,255,255,.72) 68%, rgba(255,255,255,.72) 76%, transparent 76%); }
  .bd-player-hint { position: absolute; left: 8px; bottom: 8px; z-index: 3; pointer-events: none;
    font-size: 11px; color: rgba(255,255,255,.9); background: rgba(0,0,0,.5); border-radius: 4px;
    padding: 2px 6px; opacity: 0; transition: opacity .16s; }
  .bd-player:hover .bd-player-hint { opacity: 1; }
  .bd-player-tools { position: absolute; right: 24px; bottom: 8px; z-index: 5; display: flex; gap: 4px;
    opacity: 0; transition: opacity .16s; }
  .bd-player:hover .bd-player-tools, .bd-player.full .bd-player-tools { opacity: 1; }
  .bd-player-tools button { width: 26px; height: 26px; border: 0; border-radius: 5px; padding: 0;
    background: rgba(0,0,0,.55); color: #fff; cursor: pointer; display: inline-flex;
    align-items: center; justify-content: center; }
  .bd-player-tools button:hover { background: rgba(0,0,0,.78); }
  .bd-player-tools button svg { width: 14px; height: 14px; }
  /* 播放器全屏（细则在下面宽高规则之后，那边必须压住气泡宽度，所以只保留那一份） */
  /* 尺寸菜单 */
  .bd-size-menu { position: fixed; z-index: 10000; min-width: 220px; padding: 6px; border-radius: 10px;
    background: var(--c-panel); border: 1px solid var(--c-line); box-shadow: 0 10px 30px rgba(17,24,39,.16);
    animation: bd-fade .12s ease both; }
  .bd-size-control { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 8px 10px; font-size: 12px; color: var(--c-text2); }
  .bd-size-control input { grid-column: 1 / -1; width: 100%; accent-color: var(--c-accent); cursor: ew-resize; }
  .bd-size-control output { color: var(--c-accent); font-variant-numeric: tabular-nums; }
  .bd-size-menu .it { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    height: 32px; padding: 0 10px; border-radius: 7px; font-size: 13px; color: var(--c-text); cursor: pointer; }
  .bd-size-menu .it:hover { background: var(--c-hover); }
  .bd-size-menu .it.on { color: var(--c-accent); font-weight: 500; }
  .bd-size-menu .it .k { font-size: 11px; color: var(--c-text3); }
  .bd-size-menu .it.danger { color: #E81123; }
  .bd-size-menu .sep { height: 1px; background: var(--c-line); margin: 5px 4px; }
  .bd-player .poster { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    cursor: pointer; background-size: cover; background-position: center; }
  .bd-player .poster::after { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.4); }
  .bd-player .poster .btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 16px; border-radius: 18px; background: rgba(255,255,255,.95); color: #17181A;
    font-size: 13px; font-weight: 500; border: 0; cursor: pointer; }
  .bd-player .poster .btn svg { width: 15px; height: 15px; }
  /* 改标题的小对话框 */
  .bd-title-dlg { position: fixed; z-index: 10002; width: 280px; padding: 12px 14px 10px; border-radius: 12px;
    background: var(--c-panel, #fff); border: 1px solid var(--c-line, #E2E6EE);
    box-shadow: 0 16px 40px rgba(17,24,39,.2); color: var(--c-text, #1F2329);
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif; animation: bd-fade .12s ease both; }
  .bd-title-dlg .hd { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .bd-title-dlg input { width: 100%; height: 30px; padding: 0 9px; border-radius: 7px; font-size: 13px;
    border: 1px solid var(--c-line, #E2E6EE); background: transparent; color: inherit; outline: none; }
  .bd-title-dlg input:focus { border-color: var(--c-accent, #1A7AF8); }
  .bd-title-dlg .hint { font-size: 11px; color: var(--c-text3, #86909C); line-height: 1.5; margin: 7px 0 10px; }
  .bd-title-dlg .ft { display: flex; justify-content: flex-end; gap: 8px; }
  .bd-title-dlg button { height: 28px; padding: 0 14px; border-radius: 6px; font-size: 12.5px; cursor: pointer;
    border: 1px solid transparent; font-family: inherit; }
  .bd-title-dlg button.ghost { background: transparent; border-color: var(--c-line, #E2E6EE); color: inherit; }
  .bd-title-dlg button.ok { background: var(--c-accent, #1A7AF8); color: #fff; }
  .bd-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .bd-stat { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--c-text3);
    background: var(--c-panel); border: 1px solid var(--c-line); border-radius: 11px; padding: 2px 8px; }
  .bd-stat svg { width: 12px; height: 12px; }

  /* ---------- 输入区 ---------- */
  .im-composer { flex: 0 0 auto; background: var(--c-composer); border-top: 1px solid var(--c-line-weak);
    padding: 8px 16px 10px; }
  .im-comp-chips { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .im-chip { height: 24px; padding: 0 9px; border-radius: 6px; border: 1px solid var(--c-line);
    background: var(--c-panel); color: var(--c-text2); font-size: 11.5px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 4px; }
  .im-chip svg { width: 12px; height: 12px; color: var(--c-accent); }
  .im-chip:hover { border-color: var(--c-accent); color: var(--c-accent); }
  .im-chip.ghost { border-color: transparent; background: transparent; }
  .im-comp-box { border: 1px solid var(--c-line); border-radius: var(--r-composer); background: var(--c-panel);
    display: flex; flex-direction: column; transition: border-color .15s; }
  .im-comp-box:focus-within { border-color: var(--c-accent); }
  .im-comp-tools { display: flex; align-items: center; gap: 1px; padding: 5px 8px 0; flex-wrap: wrap; }
  .im-tool { width: 26px; height: 26px; border: 0; border-radius: 5px; background: transparent;
    color: var(--c-text2); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .im-tool svg { width: 15px; height: 15px; }
  .im-tool:hover { background: var(--c-hover); color: var(--c-text); }
  .im-tool .lbl { font-size: 12px; }
  .im-tool.wide { width: auto; padding: 0 6px; gap: 2px; }
  .im-tool.wide svg { width: 11px; height: 11px; }
  .im-tool-sep { width: 1px; height: 14px; background: var(--c-line); margin: 0 4px; }
  .im-comp-input { padding: 4px 10px 2px; }
  .im-comp-input textarea { width: 100%; border: 0; outline: 0; resize: none; background: transparent;
    font-family: inherit; font-size: 13px; line-height: 1.65; color: var(--c-text); min-height: 44px;
    max-height: 150px; display: block; }
  .im-comp-input textarea::placeholder { color: var(--c-text4); }
  .im-comp-foot { display: flex; align-items: center; gap: 2px; padding: 0 8px 6px; }
  .im-comp-foot .sp { flex: 1; }
  .im-send { height: 28px; min-width: 78px; padding: 0 14px; border-radius: 5px; border: 0; cursor: pointer;
    background: var(--c-accent); color: #fff; font-size: 12.5px; font-weight: 500; }
  .im-send:hover { filter: brightness(1.06); }
  .im-send:disabled { background: var(--c-send-off); color: #fff; cursor: not-allowed; filter: none; }
  .im-send-more { width: 20px; height: 28px; border: 0; border-radius: 0 5px 5px 0; cursor: pointer;
    background: var(--c-accent); color: #fff; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
  .im-send-group { display: inline-flex; align-items: center; border-radius: 5px; overflow: hidden; }
  .im-send-group .im-send { border-radius: 5px 0 0 5px; min-width: 64px; }
  .im-comp-hint { font-size: 11px; color: var(--c-text4); text-align: right; padding: 0 2px 2px; }

  /* 空态 / 加载 */
  .im-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: var(--c-text3); gap: 8px; font-size: 13px; }
  .im-empty .big { font-size: 15px; font-weight: 600; color: var(--c-text2); letter-spacing: .5px; }
  .im-loading { display: flex; align-items: center; gap: 8px; color: var(--c-text3); font-size: 12.5px; padding: 10px 0; }
  .im-loading .sp { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--c-line);
    border-top-color: var(--c-accent); animation: bd-spin .8s linear infinite; }

  /* 皮肤切换浮层 */
  .im-skin-menu { position: fixed; z-index: 10000; min-width: 188px; padding: 6px; border-radius: 10px;
    background: var(--c-panel); border: 1px solid var(--c-line); box-shadow: 0 10px 30px rgba(17,24,39,.16);
    animation: bd-fade .12s ease both; }
  .im-skin-menu .it { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px;
    border-radius: 7px; font-size: 13px; color: var(--c-text); cursor: pointer; }
  .im-skin-menu .it:hover { background: var(--c-hover); }
  .im-skin-menu .it.on { color: var(--c-accent); font-weight: 500; }
  .im-skin-menu .it .sw { width: 14px; height: 14px; border-radius: 4px; flex: 0 0 14px; }
  .im-skin-menu .it .nm { flex: 1; }
  .im-skin-menu .it .ck { width: 14px; height: 14px; display: inline-flex; }
  .im-skin-menu .it .ck svg { width: 14px; height: 14px; }
  .im-skin-menu .hd { font-size: 11px; color: var(--c-text3); padding: 4px 10px 6px; }
  .im-skin-menu .sep { height: 1px; background: var(--c-line); margin: 5px 4px; }
  .im-skin-menu .hd2 { font-size: 11px; color: var(--c-text3); padding: 2px 10px 4px; }
  .im-skin-menu .ttl { font-size: 12px; color: var(--c-text2); padding: 0 10px 6px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .im-win.menu-open { background: var(--c-hover); color: var(--c-text); }

  /* 登录入口：未登录时亮一颗小红点，登录后隐藏 */
  .im-win .login-dot { display: block; width: 7px; height: 7px; border-radius: 50%;
    background: #F5222D; box-shadow: 0 0 0 2px var(--c-title); }
  .im-win[data-act="login"].on .login-dot { background: var(--c-text4); box-shadow: none; }

  /* 登录说明浮层 */
  .bd-login-dlg { position: fixed; z-index: 10001; width: 340px; padding: 16px 16px 12px; border-radius: 12px;
    background: var(--c-panel, #fff); border: 1px solid var(--c-line, #E2E6EE);
    box-shadow: 0 16px 44px rgba(17,24,39,.22); animation: bd-fade .14s ease both; color: var(--c-text, #1F2329); }
  .bd-login-dlg .hd { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .bd-login-dlg .st { font-size: 13px; line-height: 1.65; color: var(--c-text2, #4A4F57); }
  .bd-login-dlg .st b { color: var(--c-accent, #1A7AF8); }
  .bd-login-dlg .tip { margin-top: 8px; font-size: 12px; line-height: 1.6; color: var(--c-text3, #86909C); }
  .bd-login-dlg .ft { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
  .bd-login-dlg button { height: 30px; padding: 0 14px; border-radius: 7px; border: 0; cursor: pointer;
    font-size: 12.5px; font-family: inherit; }
  .bd-login-dlg button.ghost { background: transparent; color: var(--c-text2, #4A4F57);
    border: 1px solid var(--c-line, #E2E6EE); }
  .bd-login-dlg button.ok { background: var(--c-accent, #1A7AF8); color: #fff; }

  /* 皮肤临时关闭时的「恢复」按钮：不依赖皮肤根节点，必须自己活着 */
  .bd-restore-btn { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
    height: 34px; padding: 0 16px; border-radius: 8px; border: 0; cursor: pointer;
    background: #1A7AF8; color: #fff; font-size: 12.5px; font-family: inherit;
    box-shadow: 0 8px 24px rgba(26,122,248,.36); }

  /* toast */
  .im-toast-wrap { position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%); z-index: 9999;
    display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
  .im-toast { background: rgba(23,24,26,.88); color: #fff; font-size: 12.5px; padding: 8px 16px;
    border-radius: 6px; animation: bd-fade .18s ease both; max-width: 70vw; }

  /* 拖拽条 */
  .im-resizer { position: absolute; top: 0; right: -3px; bottom: 0; width: 6px; cursor: col-resize; z-index: 8; }
  .im-resizer:hover { background: linear-gradient(90deg, transparent, var(--c-accent-weak), transparent); }

  /* B站视频页 / 评论区专用排版
     注意：模板字符串里不能出现反引号，会直接把 String.raw 提前闭合。
     规则：--bd-player-w 由 JS 写到 #biliding-root 上，气泡与消息列跟着放宽，播放器才能真正放大；
     上限由 JS 按聊天区宽度算。 */
  .im-bubble.wide, .im-bubble.wide.wide { max-width: min(var(--bd-bubble-w, 9999px), 100%); }
  /* 消息列必须比气泡更宽，否则气泡会被 .im-msg-main 的 max-width 二次压住。
     注意 .im-msg .im-msg-main 是 (0,2,0) 选择器，这里相应提高特异性才压得住。 */
  .im-msg .im-msg-main.wide, .im-msg .im-msg-main.wide.wide {
    max-width: min(calc(var(--bd-player-w, 720px) + 64px), calc(100% - 44px));
  }
  .im-msg-main.wide .im-bubble.wide, .im-msg-main.wide .im-bubble.wide[data-bd-player-w] {
    width: min(calc(var(--bd-player-w, 720px) + 24px), 100%);
  }
  .im-bubble.wide .bd-player, .im-bubble.wide .bd-player.sized { width: min(var(--bd-player-w, 720px), 100%); }
  /* 这些宽度规则特异性比 .bd-player.float 高，会把浮窗压回聊天宽度：浮窗/全屏状态一律让位给 JS 写的尺寸 */
  .im-bubble.wide .bd-player.float, .im-bubble.wide .bd-player.full,
  .im-bubble.wide .bd-player.float.sized, .im-bubble.wide .bd-player.full.sized {
    width: auto; max-width: none;
  }
  /* 播放器全屏：必须比 .im-shell.page-blur .im-chat-body 的模糊更硬，所以带 !important */
  .bd-player.full {
    position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
    max-width: none !important; aspect-ratio: auto !important; border-radius: 0 !important;
    z-index: 10001 !important; filter: none !important;
  }
  .bd-player.full .bd-player-grip, .bd-player.full .bd-player-bar { display: none; }
  .im-shell.player-full .im-chat-head { visibility: hidden; }

  /* 浮窗模式：祖先一旦带 filter / transform，就会成为 position:fixed 的包含块，
     把「浮窗」重新钉回聊天区里；浮窗期间取消这些效果，浮窗才能真正脱离聊天区在整页移动。 */
  .im-shell.player-float .im-chat-body,
  .im-shell.player-float .im-rail,
  .im-shell.player-float .im-nav2,
  .im-shell.player-float .im-strip,
  .im-shell.player-float .im-list,
  .im-shell.player-float .im-composer { filter: none !important; }
  /* 真正的元凶：消息行 .im-msg 带入场动画 bd-fade，动画结束后仍留着 transform: matrix(...)，
     transform 祖先会让 position:fixed 变成「相对该祖先」定位，于是浮窗的 left/top 和眼睛看到的位置不一致，
     拖起来就是在飘。浮窗期间把播放器所有祖先的 transform / filter / perspective / contain 一并清掉。 */
  .im-shell.player-float .im-chat-body,
  .im-shell.player-float .im-msg,
  .im-shell.player-float .im-msg-main,
  .im-shell.player-float .im-bubble {
    transform: none !important; filter: none !important;
    perspective: none !important; contain: none !important; will-change: auto !important;
  }
  /* 浮窗要在 iframe 之上收到指针事件，否则把手拖不动。
     注意这里不能写 position:fixed !important —— 会把 JS 设置的 absolute 坐标系顶掉，浮窗就又飘了 */
  .im-shell.player-float .bd-player.float { z-index: 10000 !important; }

  /* 会议背景：模糊聊天与列表，保留顶栏与播放器（全屏播放器不受影响） */
  .im-shell.page-blur .im-rail,
  .im-shell.page-blur .im-nav2,
  .im-shell.page-blur .im-strip,
  .im-shell.page-blur .im-list,
  .im-shell.page-blur .im-chat-body,
  .im-shell.page-blur .im-composer { filter: blur(7px) saturate(.8); transition: filter .2s ease; }

  /* 触屏 / 窄屏：把 rail 收成图标条 */
  @media (max-width: 1120px) {
    .im-rail { --w-rail: 64px; }
    .im-rail-item span, .im-org-meta, .im-nav2 { display: none !important; }
    .im-rail-item { justify-content: center; padding: 0; }
  }
  `;
  // ======================= 10. 皮肤样式：钉钉 8.x =======================
  var CSS_DING = String.raw`
  .im-shell[data-skin="dingtalk"] {
    --w-rail: 132px; --w-nav2: 172px; --w-strip: 0; --w-list: 332px; --h-title: 44px;
    --r-bubble: 8px; --r-composer: 8px;
    --c-bg: #EFF2F7;
    --c-title: linear-gradient(180deg, #F8F3FE 0%, #FBF8FF 100%);
    --c-title-line: #EFE9F8;
    --c-panel: #FFFFFF; --c-panel2: #F4F5F8;
    --c-rail: #E6ECF9; --c-rail-on: #FFFFFF; --c-hover-rail: rgba(255,255,255,.55);
    --c-nav2: #EDF0F7; --c-nav2-on: #E0E5EE;
    --c-list: #F5F7FB; --c-conv-on: #E4E9F2;
    --c-chat: #F0F3F7; --c-chat-head: #FFFFFF; --c-composer: #F5F7FA;
    --c-line: #E2E6EE; --c-line-weak: #EAEEF5;
    --c-text: #1F2329; --c-text2: #4E5969; --c-text3: #86909C; --c-text4: #B4B9C2;
    --c-accent: #1A7AF8; --c-accent-weak: #E8F1FF;
    --c-hover: #EAEEF5;
    --c-tab-on: #E4E9F2; --c-tab-on-text: #1F2329;
    --c-search: #F1F2F6;
    --c-card: #FFFFFF;
    --c-bubble-me: #CBDBF7; --c-bubble-you: #FFFFFF; --c-bubble-line: #ECEFF3;
    --c-tag-line: #C6DEFF; --c-tag-text: #1A7AF8; --c-tag-bg: #EFF5FF;
    --c-send-off: #C6CBD4;
  }
  html.im-dark .im-shell[data-skin="dingtalk"] {
    --c-bg: #14161A; --c-title: #1A1D22; --c-title-line: #24272D;
    --c-panel: #1E2126; --c-panel2: #23262C;
    --c-rail: #191C21; --c-rail-on: #2A2F37; --c-hover-rail: rgba(255,255,255,.06);
    --c-nav2: #1B1E23; --c-nav2-on: #262B33;
    --c-list: #1E2126; --c-conv-on: #2A3038;
    --c-chat: #16181C; --c-chat-head: #1E2126; --c-composer: #1B1E23;
    --c-line: #2B3038; --c-line-weak: #262A31;
    --c-text: #E6E9EF; --c-text2: #B7BDC8; --c-text3: #8A919D; --c-text4: #5F6672;
    --c-accent: #4C9BFF; --c-accent-weak: #22334D;
    --c-hover: #262B33; --c-tab-on: #2A3038; --c-tab-on-text: #E6E9EF;
    --c-search: #24272D;
    --c-card: #23262C;
    --c-bubble-me: #2C4A78; --c-bubble-you: #23262C; --c-bubble-line: #2E333B;
    --c-tag-line: #33507A; --c-tag-text: #7FB4FF; --c-tag-bg: #1D2A3D;
    --c-send-off: #3A4048;
  }

  /* 顶栏：左侧问候 + 居中搜索 */
  .im-shell[data-skin="dingtalk"] .im-titlebar { backdrop-filter: saturate(150%) blur(8px); }
  .im-shell[data-skin="dingtalk"] .im-tb-search { background: #FCFAFE; border-color: #EFEAF7; }
  .im-shell[data-skin="dingtalk"] .im-tb-search:hover { background: #FFFFFF; }

  /* rail：整行胶囊选中，底部收起 */
  .im-shell[data-skin="dingtalk"] .im-rail { padding-top: 2px; }
  .im-shell[data-skin="dingtalk"] .im-org { padding: 10px 12px 8px; }
  .im-shell[data-skin="dingtalk"] .im-rail-item { height: 38px; border-radius: 8px; }
  .im-shell[data-skin="dingtalk"] .im-rail-item.on { box-shadow: 0 1px 3px rgba(17,24,39,.06); }

  /* nav2：分组标题行 + 树 */
  .im-shell[data-skin="dingtalk"] .im-nav2-head .im-icon-btn { width: 24px; height: 24px; }
  .im-shell[data-skin="dingtalk"] .im-nav2-head .im-icon-btn svg { width: 15px; height: 15px; }

  /* 列表：标题行 + 胶囊 tab */
  .im-shell[data-skin="dingtalk"] .im-list-head { height: 44px; }
  .im-shell[data-skin="dingtalk"] .im-list-body { padding: 0 6px 12px; }
  .im-shell[data-skin="dingtalk"] .im-conv { padding: 9px 8px; }

  /* 聊天头：名字 + 公司路径副标题 */
  .im-shell[data-skin="dingtalk"] .im-chat-head { height: 58px; }
  .im-shell[data-skin="dingtalk"] .im-chat-head .sub { color: #86909C; }

  /* 我自己气泡的尾巴：左上小圆角 */
  .im-shell[data-skin="dingtalk"] .im-msg .im-bubble { border-radius: 3px 8px 8px 8px; }
  .im-shell[data-skin="dingtalk"] .im-msg.me .im-bubble { border-radius: 8px 3px 8px 8px; }
  `;
  // ======================= 11. 皮肤样式：飞书 IM =======================
  var CSS_FEISHU = String.raw`
  .im-shell[data-skin="feishu"] {
    --w-rail: 214px; --w-nav2: 0; --w-strip: 50px; --w-list: 340px; --h-title: 44px;
    --r-bubble: 10px; --r-composer: 10px;
    --c-bg: #F5F6F7;
    --c-title: #FFFFFF; --c-title-line: #EFF0F1;
    --c-panel: #FFFFFF; --c-panel2: #F5F6F7;
    --c-rail: #F5F6F7; --c-rail-on: #FFFFFF; --c-hover-rail: rgba(31,35,41,.06);
    --c-nav2: #FFFFFF; --c-nav2-on: #EFF3FF;
    --c-list: #FFFFFF; --c-conv-on: #EFF3FF;
    --c-chat: #FFFFFF; --c-chat-head: #FFFFFF; --c-composer: #FFFFFF;
    --c-line: #E5E6EB; --c-line-weak: #EFF0F1;
    --c-text: #1F2329; --c-text2: #4E5969; --c-text3: #8F959E; --c-text4: #BBBFC4;
    --c-accent: #3370FF; --c-accent-weak: #EFF3FF;
    --c-hover: #F2F3F5;
    --c-tab-on: #EFF3FF; --c-tab-on-text: #3370FF;
    --c-search: #F2F3F5;
    --c-card: #FFFFFF;
    --c-bubble-me: #3370FF; --c-bubble-you: #F5F6F7; --c-bubble-line: transparent;
    --c-tag-line: #DEE0E3; --c-tag-text: #646A73; --c-tag-bg: #F5F6F7;
    --c-send-off: #DDE2EA;
  }
  html.im-dark .im-shell[data-skin="feishu"] {
    --c-bg: #101214; --c-title: #16181B; --c-title-line: #23262B;
    --c-panel: #1A1C20; --c-panel2: #202329;
    --c-rail: #16181B; --c-rail-on: #24272D; --c-hover-rail: rgba(255,255,255,.06);
    --c-nav2: #1A1C20; --c-nav2-on: #20304D;
    --c-list: #1A1C20; --c-conv-on: #22304A;
    --c-chat: #16181B; --c-chat-head: #1A1C20; --c-composer: #1A1C20;
    --c-line: #2A2E35; --c-line-weak: #24272D;
    --c-text: #E8EAED; --c-text2: #B5BAC3; --c-text3: #868D98; --c-text4: #5C636E;
    --c-accent: #5A8CFF; --c-accent-weak: #1E2C46;
    --c-hover: #24272D; --c-tab-on: #22304A; --c-tab-on-text: #8FB2FF;
    --c-search: #202329;
    --c-card: #202329;
    --c-bubble-me: #2A5BD7; --c-bubble-you: #23262C; --c-bubble-line: transparent;
    --c-tag-line: #33373E; --c-tag-text: #9AA1AC; --c-tag-bg: #24272D;
    --c-send-off: #343941;
  }

  /* 飞书：无分组栏；rail 用大图标+文字的白色胶囊 */
  .im-shell[data-skin="feishu"] .im-rail { padding: 6px 8px; }
  .im-shell[data-skin="feishu"] .im-org { padding: 8px 8px 10px; }
  .im-shell[data-skin="feishu"] .im-rail-item { height: 40px; border-radius: 10px; gap: 11px; padding: 0 11px; }
  .im-shell[data-skin="feishu"] .im-rail-item.on { box-shadow: 0 1px 4px rgba(31,35,41,.10); font-weight: 500; }
  .im-shell[data-skin="feishu"] .im-nav2 { display: none; }

  /* 飞书：strip 图标条 */
  .im-shell[data-skin="feishu"] .im-strip { background: #FFFFFF; border-right: 1px solid var(--c-line-weak); }
  html.im-dark .im-shell[data-skin="feishu"] .im-strip { background: #1A1C20; }

  /* 飞书：列表选中项左侧 3px 蓝条 */
  .im-shell[data-skin="feishu"] .im-conv { border-radius: 8px; }
  .im-shell[data-skin="feishu"] .im-conv.on { box-shadow: inset 3px 0 0 var(--c-accent); }

  /* 飞书：自己的气泡是蓝底白字，对方是灰底卡片 */
  .im-shell[data-skin="feishu"] .im-msg.me .im-bubble { color: #FFFFFF; }
  .im-shell[data-skin="feishu"] .im-msg.me .im-bubble a { color: #D6E4FF; }
  .im-shell[data-skin="feishu"] .im-msg .im-bubble { border-radius: 10px; }
  .im-shell[data-skin="feishu"] .im-msg.me .im-bubble { border-radius: 10px; }
  .im-shell[data-skin="feishu"] .im-read { display: none; }

  /* 飞书：聊天头像用圆形 */
  .im-shell[data-skin="feishu"] .im-msg .av,
  .im-shell[data-skin="feishu"] .im-chat-head .av,
  .im-shell[data-skin="feishu"] .im-conv-av,
  .im-shell[data-skin="feishu"] .im-conv-av .face,
  .im-shell[data-skin="feishu"] .im-av-grid { border-radius: 50%; }
  .im-shell[data-skin="feishu"] .im-conv-av .corner { display: none; }

  /* 飞书：输入区是描边卡片，工具栏在输入框上方 */
  .im-shell[data-skin="feishu"] .im-composer { padding: 8px 14px 12px; }
  .im-shell[data-skin="feishu"] .im-comp-box { border-radius: 10px; }
  .im-shell[data-skin="feishu"] .im-comp-input textarea { min-height: 52px; }
  .im-shell[data-skin="feishu"] .im-comp-chips { display: none; }
  `;
  // ======================= 12. 皮肤样式：企业微信 5.x =======================
  var CSS_WECOM = String.raw`
  .im-shell[data-skin="wecom"] {
    --w-rail: 168px; --w-nav2: 0; --w-strip: 0; --w-list: 320px; --h-title: 0px;
    --r-bubble: 6px; --r-composer: 6px;
    --c-bg: #F5F6F7;
    --c-title: #FFFFFF; --c-title-line: transparent;
    --c-panel: #FFFFFF; --c-panel2: #F5F6F7;
    --c-rail: #FFFFFF; --c-rail-on: #2A7CF7; --c-hover-rail: #F2F4F7;
    --c-nav2: #FFFFFF; --c-nav2-on: #F2F4F7;
    --c-list: #FFFFFF; --c-conv-on: #F2F4F7;
    --c-chat: #F7F8FA; --c-chat-head: #FFFFFF; --c-composer: #FFFFFF;
    --c-line: #E6E8EB; --c-line-weak: #EFF0F2;
    --c-text: #1A1A1A; --c-text2: #4A4F57; --c-text3: #8B9099; --c-text4: #B6BAC1;
    --c-accent: #2A7CF7; --c-accent-weak: #EAF2FE;
    --c-hover: #F2F4F7;
    --c-tab-on: #EAF2FE; --c-tab-on-text: #2A7CF7;
    --c-search: #F0F1F3;
    --c-card: #FFFFFF;
    --c-bubble-me: #D3E4FD; --c-bubble-you: #FFFFFF; --c-bubble-line: #EAEBED;
    --c-tag-line: #E3E5E8; --c-tag-text: #7A7F87; --c-tag-bg: #F5F6F7;
    --c-send-off: #C4C8D0;
  }
  html.im-dark .im-shell[data-skin="wecom"] {
    --c-bg: #141518; --c-title: #1A1B1E; --c-title-line: transparent;
    --c-panel: #1E1F23; --c-panel2: #232529;
    --c-rail: #1A1B1E; --c-rail-on: #2A7CF7; --c-hover-rail: #24262A;
    --c-nav2: #1A1B1E; --c-nav2-on: #24262A;
    --c-list: #1E1F23; --c-conv-on: #26282D;
    --c-chat: #17181B; --c-chat-head: #1E1F23; --c-composer: #1E1F23;
    --c-line: #2C2E33; --c-line-weak: #26282C;
    --c-text: #E8E9EB; --c-text2: #B6BAC1; --c-text3: #888D95; --c-text4: #5E6269;
    --c-accent: #4B93FF; --c-accent-weak: #1D2C42;
    --c-hover: #26282D; --c-tab-on: #1D2C42; --c-tab-on-text: #7FB0FF;
    --c-search: #26282C;
    --c-card: #232529;
    --c-bubble-me: #26426B; --c-bubble-you: #232529; --c-bubble-line: #2E3036;
    --c-tag-line: #33363C; --c-tag-text: #979CA4; --c-tag-bg: #26282C;
    --c-send-off: #363A41;
  }

  /* 企业微信 5.x 本体没有独立标题栏，但「切换皮肤 / 登录 / 深色 / 会议背景」必须可达：
     标题栏本体照旧隐藏，这几个键被克隆成 .im-tb-wins 浮层。
     浮层贴在 rail 底部（在「收起 / 更多」下方，按钮是横排），不去挤顶部 org 行——
     rail 只有 168px，4 个键横排塞进 org 行会把组织名压没。 */
  .im-shell[data-skin="wecom"] .im-titlebar { display: none; }
  .im-shell[data-skin="wecom"] .im-body { padding-top: 0; }
  .im-shell[data-skin="wecom"] .im-rail-tail { padding-bottom: 6px; }
  .im-tb-wins { position: static; display: flex; align-items: center; justify-content: center;
    gap: 2px; margin: 4px 8px 2px; padding: 4px 0; border-radius: 8px;
    background: var(--c-rail); border: 1px solid var(--c-line-weak); }
  .im-tb-wins .im-win { width: 28px; height: 24px; }
  .im-tb-wins .im-win svg { width: 14px; height: 14px; }

  /* rail：选中项是蓝色实心，图标与文字转白 */
  .im-shell[data-skin="wecom"] .im-rail { border-right: 1px solid var(--c-line-weak); }
  .im-shell[data-skin="wecom"] .im-org { padding: 12px 12px 10px; }
  .im-shell[data-skin="wecom"] .im-org-meta { overflow: hidden; }
  .im-shell[data-skin="wecom"] .im-org-logo { background: linear-gradient(135deg,#4096FF,#1769D2); color: #fff; }
  .im-shell[data-skin="wecom"] .im-rail-item { height: 38px; border-radius: 6px; }
  .im-shell[data-skin="wecom"] .im-rail-item.on { color: #fff; }
  .im-shell[data-skin="wecom"] .im-rail-item.on svg { color: #fff; }
  .im-shell[data-skin="wecom"] .im-rail-item.on .bd-badge { background: #fff; color: var(--c-accent); }
  .im-shell[data-skin="wecom"] .im-rail-group-title { display: block; }

  /* 列表：顶部搜索条 + 会话行 */
  .im-shell[data-skin="wecom"] .im-list-head { height: 48px; padding-right: 6px; }
  .im-shell[data-skin="wecom"] .im-list-head .im-list-title { font-size: 14px; }
  .im-shell[data-skin="wecom"] .im-list-search { padding: 0 10px 6px; }
  .im-shell[data-skin="wecom"] .im-list-tabs { padding: 0 10px 6px; }
  .im-shell[data-skin="wecom"] .im-conv { padding: 10px 8px; }
  .im-shell[data-skin="wecom"] .im-conv.on { background: var(--c-conv-on); }

  /* 聊天区：白底卡片化消息 */
  .im-shell[data-skin="wecom"] .im-chat-head { height: 56px; border-right: 0; }
  .im-shell[data-skin="wecom"] .im-chat-head .name { font-size: 15px; }
  .im-shell[data-skin="wecom"] .im-chat-body { background: #F7F8FA; }
  html.im-dark .im-shell[data-skin="wecom"] .im-chat-body { background: #17181B; }
  .im-shell[data-skin="wecom"] .im-msg .im-bubble { box-shadow: 0 1px 2px rgba(17,24,39,.04); }
  .im-shell[data-skin="wecom"] .im-comp-chips { display: none; }
  .im-shell[data-skin="wecom"] .im-composer { border-top: 1px solid var(--c-line-weak); }
  `;
  // ======================= 13. DOM 骨架 =======================
  var el = {};

  // 功能键（标题栏与企微侧栏浮层共用同一份定义，避免两处各写一遍导致漏键）
  function winButtonsHtml() {
    return [
      '<button class="im-win" data-act="skin" title="切换皮肤">' + SVG.skin + '</button>',
      '<button class="im-win" data-act="login" title="登录 / 账号"><span class="login-dot"></span></button>',
      '<button class="im-win" data-act="blur" title="会议背景（模糊本页）">' + SVG.wall + '</button>',
      '<button class="im-win" data-act="dark" title="深色/浅色">' + (state.dark ? SVG.sun : SVG.moon) + '</button>'
    ].join("");
  }
  function winButtonsFullHtml() {
    return winButtonsHtml() +
      '<span class="im-tb-sep"></span>' +
      '<button class="im-win" data-act="win-min" title="最小化">' + SVG.min + '</button>' +
      '<button class="im-win" data-act="win-max" title="最大化">' + SVG.max + '</button>' +
      '<button class="im-win close" data-act="win-close" title="关闭">' + SVG.close + '</button>';
  }

  function titlebarHtml() {
    var sk = skin();
    if (!sk.titlebar) return "";
    return [
      '<div class="im-titlebar">',
      '  <div class="im-tb-left">',
      '    <div class="im-me" title="我的资料"></div>',
      '    <div class="im-tb-apptitle" title="点击可改标签页标题">' + esc(appTitle()) + '</div>',
      '    <div class="im-tb-status"><b>小稳中</b> 在听 <span class="song">Northeast</span></div>',
      '  </div>',
      '  <div class="im-tb-center"><div class="im-tb-search">' + SVG.search +
      '<input type="search" data-act="global-search" placeholder="搜索或提问（Ctrl+Shift+F）" aria-label="搜索"></div></div>',
      '  <div class="im-tb-right">',
      winButtonsFullHtml(),
      '  </div>',
      '</div>'
    ].join("");
  }

  // 企业微信皮肤用 CSS 把整条标题栏 display:none，而「切换皮肤」等按钮只在标题栏里，
  // 结果企业微信皮肤下换皮肤入口不可达。这里把这几个功能键复制一份浮到 rail 顶部。
  // 注意判断依据是皮肤 id 而不是 sk.titlebar——三套皮肤 titlebar 都是 true，差别只在 CSS。
  function railWinsHtml() {
    var sk = skin();
    if (sk.id !== "wecom") return "";
    return [
      '<div class="im-tb-wins">',
      winButtonsHtml(),
      '</div>'
    ].join("");
  }

  function railHtml() {
    var sk = skin();
    if (!sk.rail) return "";
    var items = sk.railItems.map(function (it) {
      return '<button class="im-rail-item' + (it.on ? " on" : "") + '" data-rail="' + it.k + '" title="' + esc(it.label) + '">' +
        SVG[it.icon] + '<span>' + esc(it.label) + '</span>' +
        (it.badge ? '<i class="bd-badge" data-badge="' + it.k + '">20</i>' : "") +
        (it.dot ? '<i class="dot"></i>' : "") +
        '</button>';
    }).join("");
    // 企业微信：分组树直接长在 rail 里（和导航同一个滚动区，避免挤压）
    var groups = "";
    if (sk.id === "wecom") {
      groups = '<div class="im-rail-sec"><div class="im-rail-group-title">分组</div>' +
        sk.listNav.map(function (n) {
          return '<button class="im-rail-item" data-nav2="' + esc(n) + '"><span>' + esc(n) + '</span>' +
            (n === "未读" ? '<i class="bd-badge">99+</i>' : "") + '</button>';
        }).join("") + '</div>';
    }
    return [
      '<div class="im-rail">',
      '  <div class="im-org" title="' + esc(sk.org) + '">',
      '    <div class="im-org-logo">云</div>',
      '    <div class="im-org-meta"><div class="im-org-name">' + esc(sk.org) + '</div>' +
      '<div class="im-org-sub">云枢科技股份有限公司</div></div>',
      SVG.chevdown,
      '  </div>',
      '  <div class="im-rail-nav">' + items + groups + '</div>',
      '  <div class="im-rail-tail">',
      '    <button class="im-rail-item" data-act="collapse">' + SVG.back + '<span>收起</span></button>',
      '    <button class="im-rail-item" data-act="more">' + SVG.more + '<span>更多</span></button>',
      railWinsHtml(),
      '  </div>',
      '</div>'
    ].join("");
  }

  function nav2Html() {
    var sk = skin();
    if (!sk.nav2) return "";
    var top = sk.listNav.map(function (n, i) {
      var badge = "";
      if (n === "消息") badge = '<i class="bd-badge" data-badge="nav-msg">20</i>';
      if (n === "群聊") badge = '<i class="bd-badge" data-badge="nav-group">20</i>';
      return '<div class="im-nav2-item' + (i === 0 ? " on" : "") + '" data-nav2="' + esc(n) + '">' +
        (n === "我创建的" ? SVG.chevdown.replace("<svg ", '<svg class="chev" ') : "") +
        '<span>' + esc(n) + '</span>' + badge + '</div>';
    }).join("");
    var tree = NAV2_GROUPS.map(function (g) {
      return '<div class="im-nav2-sub">' +
        '<div class="im-nav2-item" data-nav2="' + esc(g.name) + '"><span>' + esc(g.name) + '</span>' +
        (g.keys.length ? '<span class="n">' + g.keys.length + '</span>' : "") + '</div></div>';
    }).join("");
    return [
      '<div class="im-nav2">',
      '  <div class="im-nav2-head">',
      '    <button class="im-icon-btn" title="分组">' + SVG.sort + '</button>',
      '    <span class="t">分组</span>',
      '    <button class="im-icon-btn" title="分组设置">' + SVG.settings + '</button>',
      '  </div>',
      '  <div class="im-nav2-list">' + top + tree + '</div>',
      '  <div class="im-nav2-foot"><div class="im-nav2-item" data-act="more"><span>更多</span></div></div>',
      '</div>'
    ].join("");
  }

  function stripHtml() {
    var sk = skin();
    if (!sk.strip) return "";
    var list = [
      { k: "notify", i: "bell", t: "通知" },
      { k: "pin", i: "pin", t: "置顶" },
      { k: "mark", i: "bookmark", t: "书签" },
      { k: "msg", i: "msg", t: "消息", on: true },
      { k: "group", i: "group", t: "群聊" }
    ];
    return '<div class="im-strip">' + list.map(function (it) {
      return '<button class="im-strip-item' + (it.on ? " on" : "") + '" data-strip="' + it.k + '" title="' + it.t + '">' + SVG[it.i] + '</button>';
    }).join("") + '<div class="im-strip-sp"></div></div>';
  }

  function listHtml() {
    var sk = skin();
    var tabs = "";
    if (sk.listHeader === "chips") {
      tabs = '<div class="im-list-tabs">' +
        '<button class="im-tab on" data-f="all">消息 <span class="n" data-count="all">0</span></button>' +
        '<button class="im-tab" data-f="unread">未读 <span class="n" data-count="unread">0</span></button>' +
        '</div>';
    }
    return [
      '<div class="im-list">',
      '  <div class="im-list-head">',
      '    <div class="im-list-title">消息</div>',
      '    <button class="im-icon-btn" data-act="new" title="发起会话">' + SVG.plus + '</button>',
      '    <button class="im-icon-btn" data-act="refresh" title="刷新会话">' + SVG.refresh + '</button>',
      '  </div>',
      tabs,
      '  <div class="im-list-search" style="' + (sk.listHeader === "plain" ? "" : "display:none") + '">',
      '    <div class="box">' + SVG.search + '<input type="search" placeholder="搜索会话、视频" aria-label="搜索会话"></div>',
      '  </div>',
      '  <div class="im-list-body"></div>',
      '  <div class="im-resizer" title="拖动调整宽度"></div>',
      '</div>'
    ].join("");
  }

  function buildShell() {
    var sk = skin();
    var root = document.createElement("div");
    root.id = "biliding-root";
    root.className = "im-shell";
    root.setAttribute("data-skin", SKIN_ID);
    root.setAttribute("data-list-header", sk.listHeader);
    root.setAttribute("data-title", appTitle());
    root.innerHTML = titlebarHtml() +
      '<div class="im-body">' + railHtml() + nav2Html() + stripHtml() + listHtml() +
      '<div class="im-chat"></div></div>';
    document.body.appendChild(root);

    el.root = root;
    el.titlebar = root.querySelector(".im-titlebar");
    el.rail = root.querySelector(".im-rail");
    el.nav2 = root.querySelector(".im-nav2");
    el.strip = root.querySelector(".im-strip");
    el.list = root.querySelector(".im-list");
    el.listTitle = root.querySelector(".im-list-title");
    el.listTabs = root.querySelector(".im-list-tabs");
    el.listSearch = root.querySelector(".im-list-search");
    el.listBody = root.querySelector(".im-list-body");
    el.chat = root.querySelector(".im-chat");

    var tw = document.createElement("div");
    tw.className = "im-toast-wrap";
    document.body.appendChild(tw);
    el.toastWrap = tw;

    bindShell();
  }

  function toast(msg, ms) {
    if (!el.toastWrap) return;
    var d = document.createElement("div");
    d.className = "im-toast";
    d.textContent = msg;
    el.toastWrap.appendChild(d);
    setTimeout(function () { d.remove(); }, ms || 2200);
  }

  function bindShell() {
    var root = el.root;

    root.addEventListener("click", function (e) {
      var t = e.target;
      var skinBtn = t.closest && t.closest('[data-act="skin"]');
      if (skinBtn) { openSkinMenu(skinBtn); return; }
      var loginBtn = t.closest && t.closest('[data-act="login"]');
      if (loginBtn) { openLoginDialog(); return; }
      var meBtn = t.closest && t.closest(".im-me");
      if (meBtn) { openLoginDialog(); return; }
      var darkBtn = t.closest && t.closest('[data-act="dark"]');
      if (darkBtn) { toggleDark(); return; }
      var winBtn = t.closest && t.closest('[data-act^="win-"]');
      if (winBtn) {
        var wa = winBtn.getAttribute("data-act");
        if (wa === "win-close") toast("关闭只是演示；标签页标题与图标都已换成「" + appTitle() + "」");
        else if (wa === "win-max") togglePlayerFullOnChat();
        else toast("这是演示皮肤，窗口按钮只做样子");
        return;
      }
      var blurBtn = t.closest && t.closest("[data-act=\"blur\"]");
      if (blurBtn) { setBlur(!state.blur); return; }
      var titleEl = t.closest && t.closest(".im-tb-apptitle");
      if (titleEl) { openTitleDialog(); return; }
      var moreBtn = t.closest && t.closest('[data-act="more"]');
      if (moreBtn) { toast("B钉 v2 · 三合一 IM 皮肤，数据仅来自 B站公开页面"); return; }
      var collapseBtn = t.closest && t.closest('[data-act="collapse"]');
      if (collapseBtn) { toast("侧栏收起只是装饰；窄屏下会自动折叠"); return; }

      var railBtn = t.closest && t.closest("[data-rail]");
      if (railBtn) { onRail(railBtn.dataset.rail, railBtn); return; }
      var navBtn = t.closest && t.closest("[data-nav2]");
      if (navBtn) { onNav2(navBtn.dataset.nav2); return; }
      var stripBtn = t.closest && t.closest("[data-strip]");
      if (stripBtn) { toast("「" + stripBtn.title + "」为装饰入口"); return; }
      var tab = t.closest && t.closest(".im-tab");
      if (tab) {
        root.querySelectorAll(".im-tab").forEach(function (x) { x.classList.toggle("on", x === tab); });
        state.listFilter = tab.dataset.f;
        renderList();
        return;
      }
      var conv = t.closest && t.closest(".im-conv");
      if (conv) { openConversation(conv.dataset.conv); return; }
      var refresh = t.closest && t.closest('[data-act="refresh"]');
      if (refresh) { reloadActiveConversation(true); return; }
      var nw = t.closest && t.closest('[data-act="new"]');
      if (nw) { openConversation("conv:rcmd"); return; }
      var lis = t.closest && t.closest(".im-list-body");
      if (lis && !conv) { /* 空白处 */ }
    });

    var gs = root.querySelector('[data-act="global-search"]');
    if (gs) {
      gs.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && gs.value.trim()) doSearch(gs.value.trim());
        if (e.key === "Escape") { gs.value = ""; gs.blur(); }
      });
    }
    var ls = el.list.querySelector(".im-list-search input");
    if (ls) {
      ls.addEventListener("input", debounce(function () {
        state.listQuery = ls.value.trim();
        renderList();
      }, 220));
      ls.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && ls.value.trim()) doSearch(ls.value.trim());
      });
    }
    enableListResizer();
  }

  function onRail(k, btn) {
    if (k === "msg") { setRail("msg", btn); goHome(); return; }
    if (k === "work") { setRail("work", btn); renderWorkbench(); return; }
    if (k === "book") { setRail("book", btn); renderContacts(); return; }
    if (k === "add") { openSkinMenu(btn); return; }
    if (k === "more") { toast("B钉 v2 · 三合一 IM 皮肤"); return; }
    setRail(k, btn);
    toast("「" + btn.textContent.trim() + "」是装饰入口，点「切换皮肤」可换风格");
  }

  function setRail(id, btn) {
    state.activeRail = id;
    el.root.querySelectorAll(".im-rail-item[data-rail]").forEach(function (b) {
      b.classList.toggle("on", b === btn || b.dataset.rail === id);
    });
  }

  function onNav2(name) {
    state.activeNav2 = name;
    el.root.querySelectorAll("[data-nav2]").forEach(function (b) {
      b.classList.toggle("on", b.dataset.nav2 === name);
    });
    renderList();
    if (name === "消息" || name === "未读" || name === "群聊") return;
    var g = null;
    for (var i = 0; i < NAV2_GROUPS.length; i++) if (NAV2_GROUPS[i].name === name) g = NAV2_GROUPS[i];
    if (g && g.keys.length) { openConversation("conv:" + g.keys[0]); }
  }

  // 皮肤切换浮层。
  // 旧实现把「点外面关闭」挂在 document 的 click 上、并延迟一帧绑定——同一次点击的冒泡会立刻把菜单关掉，
  // 表现就是「点了没反应」。这里改成用 mousedown 判断，并且只在菜单已经打开之后才生效。
  var skinMenuEl = null, skinMenuAnchor = null;
  function closeSkinMenu() {
    if (skinMenuEl) { skinMenuEl.remove(); skinMenuEl = null; }
    if (skinMenuAnchor) { skinMenuAnchor.classList.remove("menu-open"); skinMenuAnchor = null; }
    document.removeEventListener("mousedown", onSkinMenuOutside, true);
    document.removeEventListener("keydown", onSkinMenuKey, true);
    window.removeEventListener("resize", closeSkinMenu);
  }
  function onSkinMenuOutside(ev) {
    if (!skinMenuEl) return;
    if (skinMenuEl.contains(ev.target)) return;
    if (skinMenuAnchor && skinMenuAnchor.contains(ev.target)) return;
    closeSkinMenu();
  }
  function onSkinMenuKey(ev) { if (ev.key === "Escape") closeSkinMenu(); }

  function openSkinMenu(anchor) {
    if (skinMenuEl) {
      var same = skinMenuAnchor === anchor;
      closeSkinMenu();
      if (same) return;
    }
    var menu = document.createElement("div");
    menu.className = "im-skin-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = '<div class="hd">切换皮肤</div>' + SKIN_ORDER.map(function (id) {
      var s = SKINS[id];
      var color = id === "dingtalk" ? "#1A7AF8" : id === "feishu" ? "#3370FF" : "#2A7CF7";
      return '<div class="it' + (id === SKIN_ID ? " on" : "") + '" role="menuitem" data-skin-pick="' + id + '">' +
        '<span class="sw" style="background:' + color + '"></span>' +
        '<span class="nm">' + esc(s.label) + '</span>' +
        '<span class="ck">' + (id === SKIN_ID ? SVG.check : "") + '</span></div>';
    }).join("") +
      '<div class="sep"></div><div class="hd2">标签页标题</div><div class="ttl">' + esc(appTitle()) + '</div>';
    document.body.appendChild(menu);
    skinMenuEl = menu;
    skinMenuAnchor = anchor;
    anchor.classList.add("menu-open");
    // 定位于按钮下方，超出右边界时向左收
    var r = anchor.getBoundingClientRect();
    var mw = menu.offsetWidth || 188, mh = menu.offsetHeight || 200;
    var left = Math.min(Math.max(8, r.left + r.width - mw), window.innerWidth - mw - 8);
    var top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";
    menu.addEventListener("click", function (e) {
      var it = e.target.closest("[data-skin-pick]");
      if (!it) return;
      e.stopPropagation();
      closeSkinMenu();
      switchSkin(it.dataset.skinPick);
    });
    // 用 setTimeout(0) 让本次点击先走完，再挂「点外面关闭」
    setTimeout(function () {
      if (!skinMenuEl) return;
      document.addEventListener("mousedown", onSkinMenuOutside, true);
      document.addEventListener("keydown", onSkinMenuKey, true);
      window.addEventListener("resize", closeSkinMenu);
    }, 0);
  }

  function switchSkin(id) {
    if (!SKINS[id] || id === SKIN_ID) return;
    SKIN_ID = id;
    lsSet(LS.skin, id);
    closeSkinMenu();
    paintFavicon();
    syncTitle(true);
    el.root.remove();
    el.toastWrap.remove();
    // 结构差异较大，直接重建骨架再套用当前路由
    buildShell();
    if (state.dark) document.documentElement.classList.add(DARK_CLASS);
    loadMe();
    applyRoute();
    toast("已切换到「" + SKINS[id].label + "」皮肤");
  }

  function toggleDark() {
    state.dark = !state.dark;
    lsSet(LS.dark, state.dark ? "1" : "0");
    applyDark();
    var btn = el.root.querySelector('[data-act="dark"]');
    if (btn) btn.innerHTML = state.dark ? SVG.sun : SVG.moon;
  }
  function applyDark() {
    document.documentElement.classList.toggle(DARK_CLASS, state.dark);
  }

  function enableListResizer() {
    var rz = el.list.querySelector(".im-resizer");
    if (!rz) return;
    var startX = 0, startW = 0, dragging = false;
    rz.addEventListener("mousedown", function (e) {
      dragging = true; startX = e.clientX; startW = el.list.getBoundingClientRect().width;
      document.body.style.cursor = "col-resize"; e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var w = Math.min(460, Math.max(240, startW + e.clientX - startX));
      el.root.style.setProperty("--w-list", w + "px");
      lsSet(LS.listW, String(w));
    });
    window.addEventListener("mouseup", function () {
      if (!dragging) return;
      dragging = false; document.body.style.cursor = "";
    });
    var saved = Number(lsGet(LS.listW, 0));
    if (saved > 0) el.root.style.setProperty("--w-list", saved + "px");
  }
  // ======================= 14. 会话列表 =======================
  function allConversations() {
    var list = [];
    DECOY_CONVS.forEach(function (d) { list.push(d); });
    CHANNELS.forEach(function (ch) {
      var cache = state.convCache[ch.key];
      var first = cache && cache.items && cache.items[0];
      list.push({
        id: "conv:" + ch.key,
        name: ch.group,
        tag: ch.key === "rcmd" ? "推荐" : "内部群",
        preview: first
          ? esc(first.owner) + "：" + esc(clip(first.title, 28))
          : ch.label + "专区 · " + (ch.key === "hot" ? "热榜持续更新" : "视频同步中"),
        time: first ? fmtRel(first.pubdate) : "",
        avatar: ch.avatar,
        color: ch.color,
        unread: state.unread[ch.key] || 0,
        mute: ch.key !== "rcmd",
        members: 8,
        channel: ch
      });
    });
    return list;
  }

  function filterByNav(list) {
    var nav = state.activeNav2 || "消息";
    if (nav === "消息" || nav === "未读") return list;
    if (nav === "置顶") return list.filter(function (c) { return c.channel && (c.channel.key === "rcmd" || c.channel.key === "hot"); });
    if (nav === "单聊") return list.filter(function (c) { return !c.channel && !c.members; });
    if (nav === "群聊") return list.filter(function (c) { return c.channel || c.members > 0; });
    if (nav === "我创建的") return list;
    for (var i = 0; i < NAV2_GROUPS.length; i++) {
      if (NAV2_GROUPS[i].name === nav) {
        var keys = NAV2_GROUPS[i].keys;
        return list.filter(function (c) { return c.channel && keys.indexOf(c.channel.key) >= 0; });
      }
    }
    return list;
  }

  function renderList() {
    if (!el.listBody) return;
    var convs = filterByNav(allConversations());
    if (state.listQuery) {
      var q = state.listQuery.toLowerCase();
      convs = convs.filter(function (c) { return (c.name + " " + c.preview).toLowerCase().indexOf(q) >= 0; });
    }
    if (state.listFilter === "unread") convs = convs.filter(function (c) { return (c.unread || 0) > 0; });

    var all = allConversations();
    var totalUnread = all.reduce(function (s, c) { return s + (c.unread || 0); }, 0);
    var cAll = el.root.querySelector('[data-count="all"]');
    var cUn = el.root.querySelector('[data-count="unread"]');
    if (cAll) cAll.textContent = all.length ? String(all.length) : "";
    if (cUn) cUn.textContent = totalUnread ? (totalUnread > 99 ? "99+" : String(totalUnread)) : "";

    var html = convs.map(convRowHtml).join("");
    if (!html) html = '<div class="im-list-empty">没有匹配的会话</div>';
    el.listBody.innerHTML = html;
  }

  function avatarGrid(c) {
    if (!c.channel || !c.members) return null;
    var colors = ["#1A87FF", "#4D8DFF", "#12B5CB", "#00C56C"];
    var letters = [c.avatar, "B", "站", "群"];
    var cells = "";
    for (var i = 0; i < 4; i++) {
      cells += '<span style="background:' + colors[i] + '">' + esc(letters[i]) + '</span>';
    }
    return '<div class="im-av-grid">' + cells + '</div>';
  }

  function convRowHtml(c) {
    var on = state.activeConv === c.id ? " on" : "";
    var grid = avatarGrid(c);
    var inner = grid
      ? grid
      : (c.imgUrl
        ? '<span class="face"><img src="' + esc(c.imgUrl) + '" alt=""></span>'
        : esc(c.avatar || "群"));
    var badge = c.unread
      ? '<span class="im-conv-badge">' + (c.unread > 99 ? "99+" : c.unread) + '</span>'
      : "";
    var preview = c.preview || "";
    if (c.read) preview = '<em>[已读]</em>' + preview;
    return '<div class="im-conv' + on + '" data-conv="' + esc(c.id) + '" title="' + esc(c.name) + '">' +
      '<div class="im-conv-av" style="background:' + esc(c.color || "#1A7AF8") + '">' + inner + badge +
      (c.members > 4 ? '<i class="corner">' + SVG.group + '</i>' : "") + '</div>' +
      '<div class="im-conv-main">' +
      '<div class="im-conv-row1"><div class="im-conv-name">' + esc(c.name) + '</div>' +
      (c.tag ? '<span class="im-tag">' + esc(c.tag) + '</span>' : "") +
      '<div class="im-conv-time">' + esc(c.time || "") + '</div></div>' +
      '<div class="im-conv-row2"><div class="im-conv-msg">' + preview + '</div>' +
      (c.mute ? '<span class="im-conv-mute">' + SVG.bell + '</span>' : "") +
      '</div></div></div>';
  }

  function syncActiveRow() {
    if (!el.listBody) return;
    el.listBody.querySelectorAll(".im-conv").forEach(function (r) {
      r.classList.toggle("on", r.dataset.conv === state.activeConv);
    });
  }

  // ======================= 15. 聊天区 =======================
  function chatHeaderHtml(o) {
    var av = o.img
      ? '<img src="' + esc(o.img) + '" alt="">'
      : esc(o.avatar || "群");
    var acts = [
      { i: "wall", t: state.blur ? "关闭会议背景" : "会议背景", act: "blur", on: state.blur },
      { i: "phone", t: "语音通话" },
      { i: "folder", t: "群文件" },
      { i: "adduser", t: "添加成员" },
      { i: "search", t: "搜索聊天记录" },
      { i: "settings", t: "会话设置" }
    ].map(function (a) {
      var icon = SVG[a.i] || "";
      if (a.act === "blur") {
        return '<button class="im-icon-btn' + (a.on ? " on" : "") + '" title="' + a.t + '" data-act="blur">' + icon + '</button>';
      }
      return '<button class="im-icon-btn" title="' + a.t + '" data-deco="' + a.t + '">' + icon + '</button>';
    }).join("");
    return '<div class="im-chat-head">' +
      '<div class="av" style="background:' + esc(o.color || "#1A7AF8") + '">' + av + '</div>' +
      '<div class="meta"><div class="name">' + esc(o.name || "") +
      (o.tag ? '<span class="im-tag">' + esc(o.tag) + '</span>' : "") + '</div>' +
      '<div class="sub">' + esc(o.sub || "") + '</div></div>' +
      (o.extraActs || "") +
      '<div class="acts">' + acts + '</div></div>';
  }

  function composerHtml(placeholder, disabled) {
    var cs = skin().composer;
    var chips = cs.chips && cs.chips.length
      ? '<div class="im-comp-chips">' + cs.chips.map(function (c) {
        return '<button class="im-chip">' + SVG.check + esc(c) + '</button>';
      }).join("") + '<button class="im-chip ghost">' + SVG.more + '</button></div>'
      : "";
    var tools = cs.toolbar.map(function (k, i) {
      var sep = (i === 4 || i === 8) ? '<span class="im-tool-sep"></span>' : "";
      return sep + '<button class="im-tool" title="' + k + '">' + (SVG[k] || "") + '</button>';
    }).join("");
    var footTools = cs.tools.map(function (k) {
      return '<button class="im-tool" title="' + k + '">' + (SVG[k] || "") + '</button>';
    }).join("");
    return '<div class="im-composer">' + chips +
      '<div class="im-comp-box">' +
      '<div class="im-comp-tools">' + tools + '</div>' +
      '<div class="im-comp-input"><textarea rows="2" placeholder="' + esc(placeholder || cs.placeholder) + '"' + (disabled ? " disabled" : "") + '></textarea></div>' +
      '<div class="im-comp-foot">' + footTools + '<span class="sp"></span>' +
      '<button class="im-icon-btn" title="更多">' + SVG.more + '</button>' +
      '<span class="im-send-group"><button class="im-send"' + (disabled ? " disabled" : "") + '>发送(S)</button>' +
      '<button class="im-send-more"' + (disabled ? " disabled" : "") + '>' + SVG.chevdown + '</button></span>' +
      '</div></div>' +
      '<div class="im-comp-hint">' + esc(cs.hint) + '</div>' +
      '</div>';
  }

  function scrollChatToBottom() {
    var body = el.chat && el.chat.querySelector(".im-chat-body");
    if (body) body.scrollTop = body.scrollHeight;
  }
  function scrollChatToTop() {
    var body = el.chat && el.chat.querySelector(".im-chat-body");
    if (body) body.scrollTop = 0;
  }

  // 单聊（视频页）默认停在顶部：先看到播放器，不必每次手动往上拉。
  // 其余会话保持「进群看最新消息」的 IM 习惯，仍然贴底。按当前会话 id 判断，不靠时序。
  function scrollChatDefault() {
    var id = state.activeConv || "";
    if (id.indexOf("conv:video") === 0 || id.indexOf("video") === 0) { scrollChatToTop(); return; }
    scrollChatToBottom();
  }

  function bindChatCommon() {
    if (!el.chat) return;
    scrollChatDefault();
    el.chat.querySelectorAll(".im-icon-btn").forEach(function (b) {
      if (b.dataset.bound) return;
      if (b.dataset.act === "blur") {
        b.dataset.bound = "1";
        b.addEventListener("click", function () { setBlur(!state.blur); });
        return;
      }
      b.dataset.bound = "1";
      b.addEventListener("click", function () { toast("「" + (b.title || "按钮") + "」是装饰按钮"); });
    });
    var ta = el.chat.querySelector(".im-comp-input textarea");
    if (ta) {
      ta.addEventListener("input", function () {
        ta.style.height = "auto";
        ta.style.height = Math.min(150, Math.max(44, ta.scrollHeight)) + "px";
      });
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); submitComposer(); }
      });
    }
    var sb = el.chat.querySelector(".im-send");
    if (sb) sb.addEventListener("click", submitComposer);
    var sm = el.chat.querySelector(".im-send-more");
    if (sm) sm.addEventListener("click", function () { toast("发送选项：Enter 发送 / Ctrl+Enter 换行"); });
  }

  function submitComposer() {
    var ta = el.chat.querySelector(".im-comp-input textarea");
    if (!ta || ta.disabled) return;
    var v = ta.value.trim();
    if (!v) return;
    ta.value = "";
    ta.style.height = "";
    toast("B钉只做皮肤，不代发内容；去 B站原页面操作更稳妥");
  }

  // 单条消息
  function msgHtml(o) {
    var isMe = !!o.me;
    var av = o.face
      ? '<img src="' + esc(o.face) + '" alt="">'
      : esc(o.avatar || (o.author || "?").slice(0, 1));
    return '<div class="im-msg' + (isMe ? " me" : "") + '"' + (o.bvid ? ' data-bvid="' + esc(o.bvid) + '"' : "") + '>' +
      '<div class="av" style="background:' + esc(o.color || "#8A93A0") + '">' + av + '</div>' +
      '<div class="im-msg-main' + (o.wide ? " wide" : "") + '">' +
      (isMe ? "" : '<div class="im-msg-meta"><span class="im-msg-author">' + esc(o.author || "") + '</span>' +
        (o.time ? '<span class="im-msg-time">' + esc(o.time) + '</span>' : "") + '</div>') +
      '<div class="im-bubble' + (o.wide ? " wide" : "") + '"' + (o.wide ? ' data-bd-player-w="1"' : "") + '>' +
      (o.quote ? '<div class="bd-quote">' + o.quote + '</div>' : "") + o.body + '</div>' +
      (isMe ? '<div class="im-read">已读</div>' : "") +
      (o.extra || "") +
      '</div></div>';
  }

  function daysep(text) { return '<div class="im-daysep"><span>' + esc(text) + '</span></div>'; }

  // 视频卡片
  function videoCardHtml(item) {
    return '<div class="bd-card" data-bvid="' + esc(item.bvid) + '" data-aid="' + esc(item.aid) + '">' +
      '<div class="bd-card-thumb">' +
      (item.pic ? '<img src="' + esc(item.pic) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
      (item.dur ? '<span class="dur">' + fmtDur(item.dur) + '</span>' : '') +
      '<span class="play">' + SVG.play + '</span></div>' +
      '<div class="bd-card-body"><div class="bd-card-title">' + esc(item.title) + '</div>' +
      '<div class="bd-card-foot"><span class="up">' +
      (item.face ? '<img src="' + esc(item.face) + '" alt="">' : '') +
      '<span>' + esc(item.owner) + '</span></span><span class="sp"></span>' +
      (item.view ? '<span>' + fmtCount(item.view) + '播放</span>' : '') +
      (item.danmaku ? '<span>' + fmtCount(item.danmaku) + '弹幕</span>' : '') +
      '</div></div></div>';
  }

  function videoMsgHtml(item, o) {
    o = o || {};
    var who = aliasOf(o.author || item.owner);
    return msgHtml({
      me: !!o.me,
      author: who,
      time: o.time || fmtRel(item.pubdate),
      face: o.face,
      avatar: (who || "?").slice(0, 1),
      color: avColor(who || ""),
      body: videoCardHtml(item),
      bvid: item.bvid
    });
  }

  function bindVideoCards(scope) {
    scope.querySelectorAll(".bd-card").forEach(function (c) {
      if (!c.dataset.bvid || c.dataset.bound) return;
      c.dataset.bound = "1";
      c.addEventListener("click", function () { navTo("/video/" + c.dataset.bvid + "/"); });
    });
  }

  function avColor(name) {
    var palette = ["#1A7AF8", "#4D8DFF", "#12B5CB", "#00C56C", "#FF9A3D", "#9B5DE5", "#F45B9A", "#5B6EF5", "#E8A33D", "#31C48D"];
    return palette[hashStr(name) % palette.length];
  }

  // ======================= 16. 会话打开 =======================
  function openConversation(convId) {
    if (!convId) return;
    if (convId.indexOf("sys:") === 0) { openDecoyConversation(convId); return; }
    var key = convId.replace(/^conv:/, "");
    state.activeConv = convId;
    syncActiveRow();
    if (key === "rcmd") { goHome(true); return; }
    var ch = channelByKey(key);
    if (ch) { renderChannelChat(ch, key === "hot"); return; }
    goHome(true);
  }

  function openDecoyConversation(convId) {
    var d = null;
    for (var i = 0; i < DECOY_CONVS.length; i++) if (DECOY_CONVS[i].id === convId) d = DECOY_CONVS[i];
    if (!d) return;
    state.activeConv = convId;
    syncActiveRow();
    var now = Math.floor(Date.now() / 1000);
    var script = d.members
      ? [
        { a: "林望舒", t: "这版排期表你过一下，下周一前给出结论。", time: now - 5400 },
        { a: "周砚", t: "@林望舒 收到，我这边先跑一遍台架。", time: now - 4800 },
        { a: "我", t: "我下午把测试记录同步到群里。", time: now - 720, me: true },
        { a: "林望舒", t: d.preview.replace(/^[^:]*:\s*/, ""), time: now - 300 }
      ]
      : [
        { a: d.name, t: "你还能挪一台样车给软件预研调试通讯模块不？", time: now - 900, quote: "【陈亦然】你还能挪一台样车给软件预研调试通讯模块不？", extra: '<div class="im-reply-link">1条回复</div>' },
        { a: "我", t: "哈意思，我现在一台也没有呀", time: now - 780, me: true },
        { a: d.name, t: "老机器", time: now - 600 },
        { a: d.name, t: "先用老机器预研", time: now - 540 },
        { a: "我", t: "我这里没有多的", time: now - 320, me: true },
        { a: "我", t: "只有一台", time: now - 240, me: true }
      ];
    var body = "";
    var lastDay = "";
    script.forEach(function (m) {
      var dz = new Date(m.time * 1000).toDateString();
      if (dz !== lastDay) { body += daysep(fmtRel(m.time)); lastDay = dz; }
      body += msgHtml({
        me: m.me, author: m.a, body: esc(m.t), time: fmtClock(m.time),
        avatar: m.a.slice(0, 1), color: m.me ? (state.me ? "#1A7AF8" : "#1A7AF8") : avColor(m.a)
      });
    });
    el.chat.innerHTML = chatHeaderHtml({
      name: d.name, tag: d.tag, avatar: d.avatar, color: d.color,
      sub: d.members
        ? "群聊 · " + d.members + "人 · 云枢科技股份有限公司"
        : "云枢科技股份有限公司-产品研发中心-研发管理部-项目管理组 | 项目管理工程师"
    }) + '<div class="im-chat-body">' + body + '</div>' +
      composerHtml();
    bindChatCommon();
    bindDeco();
  }

  function bindDeco() {
    if (!el.chat) return;
    el.chat.querySelectorAll("[data-deco]").forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = "1";
      b.addEventListener("click", function () { toast("「" + b.dataset.deco + "」是装饰按钮"); });
    });
  }

  function goHome(fromConv) {
    setRail("msg");
    state.activeConv = "conv:rcmd";
    syncActiveRow();
    if (!fromConv) navTo("/");
    renderRecommend();
  }

  function renderChatLoading(title, sub) {
    el.chat.innerHTML = chatHeaderHtml({ name: title || "加载中", sub: sub || "" }) +
      '<div class="im-chat-body"><div class="im-loading"><span class="sp"></span>正在同步会话记录…</div></div>' +
      composerHtml("", true);
    bindChatCommon();
  }

  // ======================= 17. 推荐流 =======================
  function renderRecommend(force) {
    var cached = state.convCache.rcmd;
    if (cached && !force) { paintRecommend(cached); return; }
    renderChatLoading("推荐流", "B站首页推荐 · 正在同步");
    apiRcmd(1).then(function (items) {
      state.convCache.rcmd = { items: items, title: "推荐流", sub: "群聊 · " + (items.length + 12) + "人 · B站首页推荐" };
      if (state.activeConv === "conv:rcmd") paintRecommend(state.convCache.rcmd);
      renderList();
    }).catch(function (err) {
      if (state.activeConv !== "conv:rcmd") return;
      el.chat.innerHTML = chatHeaderHtml({ name: "推荐流", sub: "同步失败" }) +
        '<div class="im-empty"><div>推荐流加载失败：' + esc(err.message) + '</div></div>' + composerHtml("", true);
      bindChatCommon();
    });
  }

  function paintRecommend(data) {
    var items = data.items || [];
    var body = daysep("今天") + msgHtml({
      author: "B站小助手", avatar: "B", color: "#9AA3B2", time: "09:30",
      body: "今天的推荐已经同步进来了，点开卡片直接看视频。<br>左侧分组里按分区推送，顶部搜索可以直接搜 UP 主或关键词。"
    });
    body += items.map(function (it, i) {
      return videoMsgHtml(it, { time: fmtClock(it.pubdate) || fmtRel(it.pubdate) });
    }).join("");
    body += daysep("已经到底啦");
    el.chat.innerHTML = chatHeaderHtml({
      name: data.title, tag: "推荐", avatar: "推", color: "#1A7AF8",
      sub: data.sub || "群聊 · B站首页推荐"
    }) + '<div class="im-chat-body">' + body + '</div>' + composerHtml("", true);
    bindChatCommon();
    bindDeco();
    bindVideoCards(el.chat);
  }

  // ======================= 18. 分区群 / 热门 =======================
  function renderChannelChat(ch, isPopular) {
    var key = ch.key;
    var cached = state.convCache[key];
    if (cached) { paintChannel(ch, cached); return; }
    renderChatLoading(ch.group, "正在拉取 " + ch.label + " 专区");
    var req = isPopular ? apiPopular(1) : apiRegion(ch.rid, 1);
    req.then(function (items) {
      items.sort(function (a, b) { return (b.pubdate || 0) - (a.pubdate || 0); });
      state.convCache[key] = { items: items };
      if (state.activeConv === "conv:" + key) paintChannel(ch, state.convCache[key]);
      renderList();
    }).catch(function (err) {
      if (state.activeConv !== "conv:" + key) return;
      el.chat.innerHTML = chatHeaderHtml({ name: ch.group, sub: "同步失败", avatar: ch.avatar, color: ch.color }) +
        '<div class="im-empty"><div>群消息加载失败：' + esc(err.message) + '</div></div>' + composerHtml("", true);
      bindChatCommon();
    });
  }

  function paintChannel(ch, data) {
    var items = data.items || [];
    var body = "";
    var lastDay = "";
    items.forEach(function (it) {
      var day = it.pubdate ? new Date(it.pubdate * 1000).toDateString() : "";
      if (day && day !== lastDay) { body += daysep(fmtRel(it.pubdate)); lastDay = day; }
      body += videoMsgHtml(it, { time: fmtClock(it.pubdate) || fmtRel(it.pubdate) });
    });
    if (!items.length) body = '<div class="im-empty">这个群暂时没有新消息</div>';
    el.chat.innerHTML = chatHeaderHtml({
      name: ch.group, tag: "内部群", avatar: ch.avatar, color: ch.color,
      sub: "群聊 · " + (items.length + 6) + "人 · " + ch.label + "专区"
    }) + '<div class="im-chat-body">' + body + '</div>' + composerHtml("", true);
    bindChatCommon();
    bindDeco();
    bindVideoCards(el.chat);
  }

  // ======================= 19. 视频页会话 =======================
  function renderVideoConversation(route) {
    state.activeRail = "msg";
    setRail("msg");
    state.activeConv = "conv:video:" + (route.bvid || "av" + route.av);
    syncActiveRow();
    renderChatLoading("视频会话", "正在打开会话…");
    var p = route.bvid ? apiView(route.bvid) : Promise.reject(new Error("暂不支持 av 号，请用 BV 链接"));
    p.then(function (v) {
      return apiReplies(v.aid, 1).then(function (r) { return { v: v, r: r }; }, function () { return { v: v, r: null }; });
    }).then(function (res) {
      paintVideoConversation(res.v, res.r, route);
    }).catch(function (err) {
      el.chat.innerHTML = chatHeaderHtml({ name: "视频会话", sub: "打开失败" }) +
        '<div class="im-empty"><div>会话打开失败：' + esc(err.message) + '</div></div>' + composerHtml("", true);
      bindChatCommon();
    });
  }

  function paintVideoConversation(v, r, route) {
    var up = v.owner || {}, stat = v.stat || {};
    var upName = aliasOf(up.name || "视频会话");
    var poster = toHttp(v.pic || "");
    var page = route.page || 1;
    var head = chatHeaderHtml({
      name: upName, tag: "单聊",
      sub: (v.tname || "视频") + " · " + fmtCount(stat.view) + "播放 · " + fmtCount(stat.danmaku) + "弹幕",
      img: toHttp(up.face || ""), color: "#5B8DEF",
      extraActs: '<button class="im-icon-btn" title="浮窗 / 自由缩放（拖动调大小）" data-act="player-float">' + SVG.resize + '</button>' +
        '<button class="im-icon-btn" title="播放器大小 / 全屏" data-act="player-size">' + SVG.expand + '</button>' +
        '<button class="im-icon-btn' + (aliasOff() ? "" : " on") + '" title="化名显示（点一下切回真名）" data-act="alias">' + SVG.settings + '</button>'
    });
    var card = '<div class="bd-player">' +
      '<div class="bd-player-bar"><span class="t">视频会话</span></div>' +
      '<div class="poster" style="background-image:url(' + esc(poster) + ')">' +
      '<button class="btn">' + SVG.play + '播放视频</button></div>' +
      playerToolsHtml() +
      '<span class="bd-player-hint">拖右下角改宽高 · 双击全屏</span></div>' +
      '<div style="margin-top:9px;font-size:14px;font-weight:600;line-height:1.5">' + esc(v.title) + '</div>' +
      '<div class="bd-stats">' +
      '<span class="bd-stat">' + SVG.play + fmtCount(stat.view) + ' 播放</span>' +
      '<span class="bd-stat">' + SVG.comment + fmtCount(stat.reply) + ' 评论</span>' +
      '<span class="bd-stat">' + SVG.thumb + fmtCount(stat.like) + ' 点赞</span>' +
      '<span class="bd-stat">' + esc(v.tname || "") + '</span></div>' +
      (v.desc ? '<div style="margin-top:9px;font-size:12.5px;color:var(--c-text3);line-height:1.65;white-space:pre-wrap;max-height:96px;overflow:auto">' + esc(String(v.desc).slice(0, 600)) + '</div>' : '');

    var body = daysep(fmtDate(v.pubdate));
    body += msgHtml({
      author: upName, face: toHttp(up.face || ""), time: fmtDate(v.pubdate),
      body: card, wide: true
    });
    var replies = (r && r.replies) || [];
    if (replies.length) {
      body += daysep("评论区 · 共 " + ((r.page && r.page.count) || replies.length) + " 条");
      replies.forEach(function (rep) {
        var m = rep.member || {};
        var txt = String((rep.content && rep.content.message) || "");
        var uname = aliasOf(m.uname || "匿名");
        body += msgHtml({
          author: uname, face: m.avatar ? toHttp(m.avatar) : "",
          avatar: (uname || "?").slice(0, 1), color: avColor(uname),
          time: fmtRel(rep.ctime), body: esc(txt)
        });
      });
    } else {
      body += daysep("暂无评论");
    }
    // 正在播放时绝不重建聊天区：重建会把整页视频 iframe 一起销毁重载，画面停在黑屏/重新缓冲，
    // 用户看到的就是「播放窗口卡住」。已经在播的播放器直接保留，只刷新外层信息。
    var livePlayer = el.chat && el.chat.querySelector(".bd-player.playing");
    if (livePlayer) {
      var headSlot = el.chat.querySelector(".im-chat-head");
      if (headSlot) headSlot.outerHTML = head;
      bindChatCommon();
      refreshPlayerVars();
      return;
    }
    el.chat.innerHTML = head + '<div class="im-chat-body">' + body + '</div>' +
      composerHtml("评论功能请到 B站原页面（B钉不代发）", true);
    bindChatCommon();
    bindDeco();
    var playerEl = el.chat.querySelector(".bd-player");
    if (playerEl) {
      bindPlayerResize(playerEl);
      applySavedPlayerWidth(el.chat);
      // 渲染完再按聊天区真实宽度算一次（上面那步时聊天区还没布局出来）
      refreshPlayerVars();
      setTimeout(refreshPlayerVars, 60);
      var posterEl = playerEl.querySelector(".poster");
      posterEl.addEventListener("click", function () {
        startPlayback(playerEl, v.bvid, page);
        playerEl.querySelectorAll(".bd-player-tools, .bd-player-grip").forEach(function (n) { n.style.display = ""; });
      });
      // 控件要盖在 iframe 上（iframe 会吃掉指针事件），所以播放后仍然显示
      playerEl.addEventListener("dblclick", function (e) {
        if (e.target.closest(".bd-player-tools")) return;
        togglePlayerFull(playerEl);
      });
      // 拖拽手柄：播放后 iframe 会盖住右下角，改成放在工具条里常驻
      var grip = document.createElement("div");
      grip.className = "bd-player-grip";
      playerEl.appendChild(grip);
      bindPlayerResize(playerEl, grip);
      bindPlayerTools(playerEl, v.bvid);
      var sizeBtn = el.chat.querySelector('[data-act="player-size"]');
      if (sizeBtn) {
        sizeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          openPlayerSizeMenu(sizeBtn);
        });
      }
      var aliasBtn = el.chat.querySelector('[data-act="alias"]');
      if (aliasBtn) aliasBtn.addEventListener("click", toggleAlias);
      var floatBtn = el.chat.querySelector('[data-act="player-float"]');
      if (floatBtn) {
        floatBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          setPlayerFloat(playerEl);
        });
      }
    }
  }


  // ======================= 20. 通讯录 / 工作台 / 搜索 =======================
  function renderContacts() {
    el.listTitle.textContent = "通讯录";
    if (el.listTabs) el.listTabs.style.display = "none";
    el.listSearch.style.display = "none";
    var html = '<div class="im-list-sec">我的群聊</div>' + CHANNELS.slice(0, 12).map(function (ch) {
      return convRowHtml({
        id: "conv:" + ch.key, name: ch.group, preview: ch.label + "专区", avatar: ch.avatar,
        color: ch.color, tag: "内部群", members: 8
      });
    }).join("");
    el.listBody.innerHTML = html;
    el.chat.innerHTML = chatHeaderHtml({ name: "通讯录", sub: "云枢科技股份有限公司 · B站频道", avatar: "通" }) +
      '<div class="im-body" style="flex:1"><div class="im-empty"><div class="big">通讯录</div>' +
      '<div>左侧选择群聊即可进入会话</div></div></div>' + composerHtml("", true);
    bindChatCommon();
  }

  function renderWorkbench() {
    el.listTitle.textContent = "工作台";
    if (el.listTabs) el.listTabs.style.display = "none";
    el.listSearch.style.display = "none";
    el.listBody.innerHTML = '<div class="im-list-sec">常用应用</div>' + CHANNELS.slice(0, 8).map(function (ch) {
      return convRowHtml({
        id: "conv:" + ch.key, name: ch.group, preview: ch.label + "专区", avatar: ch.avatar,
        color: ch.color, tag: "应用"
      });
    }).join("");
    var tiles = [
      { n: "推荐流", d: "首页推荐", i: "msg", key: "conv:rcmd" },
      { n: "热门榜", d: "综合热门", i: "play", key: "conv:hot" },
      { n: "知识充电", d: "知识区", i: "doc", key: "conv:knowledge" },
      { n: "科技数码", d: "数码区", i: "grid", key: "conv:tech" },
      { n: "游戏开黑", d: "游戏区", i: "play", key: "conv:game" },
      { n: "追剧日历", d: "影视区", i: "cal", key: "conv:film" }
    ];
    el.chat.innerHTML = chatHeaderHtml({ name: "工作台", sub: "B站内容入口 · 云枢科技股份有限公司", avatar: "台" }) +
      '<div class="im-chat-body"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;max-width:820px">' +
      tiles.map(function (t) {
        return '<div class="bd-card" data-work="' + esc(t.key) + '" style="padding:14px;display:flex;gap:10px;align-items:center;cursor:pointer">' +
          '<span style="width:34px;height:34px;border-radius:8px;background:var(--c-accent-weak);color:var(--c-accent);display:flex;align-items:center;justify-content:center">' + SVG[t.i] + '</span>' +
          '<span><div style="font-size:13px;font-weight:500">' + esc(t.n) + '</div>' +
          '<div style="font-size:11.5px;color:var(--c-text3)">' + esc(t.d) + '</div></span></div>';
      }).join("") + '</div></div>' + composerHtml("", true);
    bindChatCommon();
    el.chat.querySelectorAll("[data-work]").forEach(function (c) {
      c.addEventListener("click", function () { openConversation(c.dataset.work); });
    });
  }

  function doSearch(kw) {
    state.listQuery = kw;
    el.listTitle.textContent = "搜索";
    if (el.listTabs) el.listTabs.style.display = "none";
    el.listSearch.style.display = "";
    el.listBody.innerHTML = '<div class="im-list-empty">搜索中…</div>';
    el.chat.innerHTML = chatHeaderHtml({ name: "搜索 · " + kw, sub: "B站全站视频" }) +
      '<div class="im-chat-body"><div class="im-loading"><span class="sp"></span>正在搜索“' + esc(kw) + '”…</div></div>' +
      composerHtml("", true);
    bindChatCommon();
    apiSearch(kw).then(function (items) {
      if (!items.length) {
        el.listBody.innerHTML = '<div class="im-list-empty">没有找到相关视频</div>';
        el.chat.innerHTML = chatHeaderHtml({ name: "搜索 · " + kw, sub: "无结果" }) +
          '<div class="im-empty">没有找到相关视频</div>' + composerHtml("", true);
        bindChatCommon();
        return;
      }
      el.listBody.innerHTML = items.map(function (it, i) {
        return convRowHtml({
          id: "search:" + i, name: it.title, preview: it.owner + " · " + fmtCount(it.view) + "播放",
          avatar: (it.owner || "?").slice(0, 1), color: avColor(it.owner), imgUrl: it.face,
          time: fmtRel(it.pubdate), tag: "视频"
        });
      }).join("");
      var body = daysep("搜索结果 · " + items.length + " 条") + items.map(function (it) {
        return videoMsgHtml(it, {});
      }).join("");
      el.chat.innerHTML = chatHeaderHtml({ name: "搜索 · " + kw, sub: items.length + " 条结果", tag: "搜索" }) +
        '<div class="im-chat-body">' + body + '</div>' + composerHtml("", true);
      bindChatCommon();
      bindVideoCards(el.chat);
    }).catch(function (err) {
      el.listBody.innerHTML = '<div class="im-list-empty">搜索失败</div>';
      el.chat.innerHTML = chatHeaderHtml({ name: "搜索失败", sub: err.message }) +
        '<div class="im-empty">搜索接口异常（可能需要登录或签名）</div>' + composerHtml("", true);
      bindChatCommon();
    });
  }

  // ======================= 21. 刷新 / 路由 =======================
  function reloadActiveConversation(force) {
    var id = state.activeConv || "";
    if (id.indexOf("conv:") !== 0) { renderList(); return; }
    var key = id.slice(5);
    if (key === "rcmd") { delete state.convCache.rcmd; renderRecommend(true); return; }
    var ch = channelByKey(key);
    if (ch) { delete state.convCache[key]; renderChannelChat(ch, key === "hot"); return; }
    renderList();
  }

  function showListArea() {
    if (el.listTabs) el.listTabs.style.display = "";
    el.listSearch.style.display = "none";
    el.listTitle.textContent = "消息";
  }

  function applyRoute() {
    var route = parseRoute();
    showListArea();
    state.listQuery = "";
    var si = el.list.querySelector(".im-list-search input");
    if (si) si.value = "";
    renderList();

    if (route.kind === "video") { renderVideoConversation(route); return; }
    if (route.kind === "region") {
      state.activeConv = "conv:" + route.channel.key;
      syncActiveRow();
      renderChannelChat(route.channel, false);
      return;
    }
    if (route.kind === "popular") {
      state.activeConv = "conv:hot";
      syncActiveRow();
      renderChannelChat(channelByKey("hot"), true);
      return;
    }
    if (route.kind === "search") { doSearch(route.keyword); return; }
    goHome(true);
  }

  var ROUTE_RE = /^\/(video\/|popular|c\/|v\/|anime\/|guochuang\/|variety\/|movie\/|tv\/|documentary\/|music\/|dance\/|game\/|knowledge\/|tech\/|food\/|life\/|ent\/|car\/|fashion\/|kichiku\/|douga\/|sports)/;

  function navTo(href) {
    if (MOCK) { mockNav(href); return; }
    try { history.pushState(null, "", href); } catch (e) { location.href = href; return; }
    applyRoute();
  }

  // 预览页只有一条 file:// 地址，切会话时直接改假路由，不碰真实 URL
  function mockNav(href) {
    if (!MOCK) return;
    var m = /^\/video\/(BV[0-9A-Za-z]+)/.exec(href);
    if (m) MOCK.route = { kind: "video", key: "video", bvid: m[1], page: 1 };
    else if (href.indexOf("/popular") === 0) MOCK.route = { kind: "popular", key: "popular" };
    else MOCK.route = { kind: "home", key: "home" };
    var hit = /^\/c\/([a-z]+)\/?/.exec(href);
    if (hit) {
      var ch2 = channelByKey(hit[1]);
      if (ch2) MOCK.route = { kind: "region", key: "region", channel: ch2 };
    }
    applyRoute();
  }
  // ======================= 18.5 视频播放（播放器宽度 / 全屏 / 播放源） =======================
  // 设计目标：
  // 1) 播放器能放大——宽度写到 .im-shell 的 --bd-player-w 上，气泡跟着放宽，上限取聊天区实际宽度；
  // 2) 提供全屏；
  // 3) 播放源优先用「当前页的 B站播放器」（片段源码里已有 player.html 的 iframe，这里复用并接管），
  //    保证清晰度、登录态、弹幕、全屏都和网页端一致；拿不到官方播放器时降级到外链播放器。

  function playerDefaults() {
    return {
      min: 320,
      max: 1600,
      preset: 720,
      name: "",
      // 必须用「整张视频页」做同源 iframe，不用 player.bilibili.com 轻量嵌入器：
      // 同源的 www.bilibili.com/video/BVxxx 走网页端同一套 playurl，登录态、清晰度、弹幕、全屏都和官网一致。
      // autoplay=0 抑制自动播放；danmaku=0 避免弹幕和聊天区抢视线。
      tpl: '//www.bilibili.com/video/__BVID__/?page=__P__&autoplay=0&danmaku=0&high_quality=1',
      cn: 1
    };
  }

  function clampPlayerW(w) {
    var d = state.playerDef || playerDefaults();
    return Math.min(d.max, Math.max(d.min, Math.round(Number(w) || d.preset)));
  }
  // 播放器窗口：宽（w）高（h）两个方向都能拖，位置（x/y）只在浮窗模式下用。
  // 16:9 只是默认比例，拖完就按用户拉的尺寸走（aspect-ratio:auto），不再被比例锁死。
  // 高度上限按视口算，避免拉出屏幕；没设过高度时用宽度换算的 16:9。
  function clampPlayerH(h) {
    var vh = Math.max(180, (window.innerHeight || 900) - 120);
    var fallback = Math.round(clampPlayerW(Number(lsGet(LS.playerW, 0)) || 720) * 9 / 16);
    return Math.min(vh, Math.max(180, Math.round(Number(h) || fallback)));
  }
  function playerGeom() {
    var w = Number(lsGet(LS.playerW, 0)) || 0;
    var h = Number(lsGet("biliding-player-h", 0)) || 0;
    var px = Number(lsGet("biliding-player-x", 0)) || 0;
    var py = Number(lsGet("biliding-player-y", 0)) || 0;
    return { w: w, h: h, x: px, y: py, float: lsGet("biliding-player-float", "") === "1" };
  }
  function savePlayerGeom(g) {
    if (g.w) lsSet(LS.playerW, String(g.w));
    if (g.h) lsSet("biliding-player-h", String(g.h));
    if (g.x || g.y) { lsSet("biliding-player-x", String(g.x || 0)); lsSet("biliding-player-y", String(g.y || 0)); }
    if (typeof g.float === "boolean") lsSet("biliding-player-float", g.float ? "1" : "");
  }
  function chatAreaWidth() {
    var c = el.chat && (el.chat.querySelector(".im-chat-body") || el.chat);
    var w = c ? c.clientWidth : 900;
    // 96 = 聊天区左右内边距 + 头像列 + 滚动条；24 = 气泡内边距与边框。
    // 两者都要扣掉，播放器才能完整放进气泡，同时不会把聊天区撑出横向滚动条。
    var limit = Math.max(240, (w || 900) - 96 - 24);
    // 预览页故意只撑到里面的宽度（外部页面截图时右侧有留白）
    if (MOCK && MOCK.chatMax) limit = Math.min(limit, MOCK.chatMax);
    return limit;
  }
  // 把宽度写到根节点上（只写 CSS 变量的值，不能写整条声明，否则会在值里生成 "--bd-player-w:" 前缀）
  // 宽高写成 CSS 变量，气泡和播放器一起放大；高度只作用在播放器本身上。
  var currentW = 0;
  function applyPlayerW(w) {
    currentW = w;
    if (!el.root) return;
    var floatingPlayer = document.querySelector("#biliding-root .bd-player.float");
    if (floatingPlayer) floatingPlayer.style.width = w + "px";
    el.root.style.setProperty("--bd-player-w", w + "px");
    [].slice.call(document.querySelectorAll("#biliding-root .im-msg-main.wide")).forEach(function (m) {
      var b = m.querySelector(".im-bubble.wide");
      var pl = m.querySelector(".bd-player");
      if (!b || !pl) return;
      var row = m.closest(".im-msg") || m;
      // 浮窗状态下播放器已经脱离聊天流，聊天列不该再按浮窗宽度撑开，
      // 否则拉大浮窗会在聊天区底部压出一条横向滚动条。
      if (pl.classList.contains("float")) {
        b.style.maxWidth = "";
        b.style.boxSizing = "";
        b.style.width = "";
        m.style.maxWidth = "";
        row.style.width = "";
        row.style.maxWidth = "";
        var fb = m.closest(".im-chat-body");
        if (fb) fb.classList.remove("has-wide-player");
        return;
      }
      // 气泡是 border-box，左右各 11px 内边距 + 1px 边框，所以要比播放器宽 24px 才装得下
      var bw = w + 24;
      b.style.boxSizing = "border-box";
      // 聊天区真正能放下「气泡 + 头像列 + 间距」的宽度；播放器默认应缩到可用宽度内，
      // 只有用户主动拉到比它还宽时才进入横向滚动。
      var bodyEl = m.closest(".im-chat-body");
      var avail = bodyEl ? bodyEl.clientWidth - 44 - 40 : 0;
      var needHScroll = avail > 0 && bw > avail;
      var fitW = needHScroll ? w : Math.max(160, Math.min(w, avail - 24));
      var fitBubble = fitW + 24;
      b.style.maxWidth = "none";
      b.style.width = fitBubble + "px";
      pl.style.width = fitW + "px";
      pl.style.maxWidth = "100%";
      // 记下实际生效宽度，供 applyPlayerBox 复用，避免被原始宽度覆盖
      pl._bdFitW = fitW;
      // 消息列要比气泡再宽一点（头像列 + 间距），否则气泡会被 74% 的旧规则压回去
      m.style.maxWidth = (fitBubble + 40) + "px";
      if (bodyEl) bodyEl.classList.toggle("has-wide-player", needHScroll);
      if (needHScroll) {
        // 确实超宽：整行按内容宽度撑开，靠聊天区横向滚动看全
        row.style.width = "max-content";
        row.style.maxWidth = "none";
        b.style.maxWidth = "none";
      } else {
        row.style.width = "";
        row.style.maxWidth = "";
        b.style.maxWidth = "";
      }
    });
  }
  // 高度 / 浮窗统一从这里写，避免两处各自改内联样式打架
  function applyPlayerBox(w, h, float) {
    if (!el.root) return;
    el.root.style.setProperty("--bd-player-w", w + "px");
    el.root.style.setProperty("--bd-player-h", h + "px");
    [].slice.call(el.root.querySelectorAll(".bd-player")).forEach(function (pl) {
      // 聊天内模式下，applyPlayerW 已经把播放器缩到「聊天气区放得下」的宽度，
      // 这里不要再用原始 w 覆盖回去，否则会出现「明明放得下却把聊天区撑出横向滚动条」。
      var inChatFit = !float && !pl.classList.contains("float") ? pl._bdFitW : 0;
      pl.style.width = (float ? w : (inChatFit || w)) + "px";
      pl.style.height = h + "px";
      pl.classList.add("sized");
      pl.classList.toggle("float", !!float);
    });
    // 浮窗放大后可能超出右/下边界：按「当前视觉位置」重新夹一次，把它推回视口内
    var fp = el.root.querySelector(".bd-player.float");
    if (fp) {
      var cur = floatToViewport(fp);
      var p = setFloatViewportPos(fp, cur.x, cur.y);
      var g = playerGeom();
      g.x = p.x;
      g.y = p.y;
      savePlayerGeom(g);
    }
  }

  // 播放器宽度上限：按「整页视口」算，不再锁死在聊天区宽度里。
  // 之前用聊天区宽度当上限，滑杆往右拉会被立刻夹回去，看起来就是「只能缩小、不能放大」。
  function playerMaxW(floating) {
    var d = state.playerDef || playerDefaults();
    var room = (window.innerWidth || 1280) - 32;
    return Math.max(d.min + 40, Math.min(d.max, room));
  }
  function refreshPlayerVars() {
    if (!el.root) return;
    var d = state.playerDef || playerDefaults();
    var g = playerGeom();
    // 聊天内模式要按聊天区可用宽度收敛（默认 720 在窄聊天区会溢出、压出横向滚动条）；
    // 浮窗模式才用视口宽度，这样「放大」才有意义。
    var limit = g.float ? playerMaxW(true) : Math.max(160, chatAreaWidth());
    var w = clampPlayerW(g.w || d.preset);
    if (w > limit) w = limit;
    var h = clampPlayerH(g.h || Math.round(w * 9 / 16));
    var player = document.querySelector("#biliding-root .bd-player.float") || (el.chat && el.chat.querySelector(".bd-player"));
    if (player) player.classList.toggle("sized", !!g.w);
    state.playerW = w;
    applyPlayerW(w);
    applyPlayerBox(w, h, g.float);
    applyFloatPos(player);
  }
  function setPlayerWidth(px, playerEl) {
    var d = state.playerDef || playerDefaults();
    var floating = playerEl && playerEl.classList.contains("float");
    var limit = playerMaxW(floating);
    var w = clampPlayerW(px);
    if (w > limit) w = limit;
    // 夹到上限时也存「用户点的是哪一档」，否则下次进来会被重新夹小、看起来像没生效
    state.playerW = w;
    applyPlayerW(w);
    lsSet(LS.playerW, String(clampPlayerW(px)));
    if (playerEl) playerEl.classList.add("sized");
    // 真实套用尺寸：浮窗要按新宽度重新钳位置，否则拉到最宽会直接顶出视口右侧
    var h = clampPlayerH(Number(lsGet("biliding-player-h", 0)) || Math.round(w * 9 / 16));
    applyPlayerBox(w, h, floating);
    return w;
  }
  function applySavedPlayerWidth(scope) {
    refreshPlayerVars();
    if (scope) [].slice.call(scope.querySelectorAll(".bd-player")).forEach(function (p) {
      if (Number(lsGet(LS.playerW, 0)) > 0) p.classList.add("sized");
    });
  }

  // 右下角手柄：横竖同时拖，宽高一起变。
  function bindPlayerResize(playerEl, handle) {
    var grip = handle || playerEl.querySelector(".bd-player-grip");
    if (!grip || grip.dataset.bound) return;
    grip.dataset.bound = "1";
    var dragging = false, startX = 0, startY = 0, startW = 0, startH = 0;
    grip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      var r = playerEl.getBoundingClientRect();
      startW = r.width; startH = r.height;
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var w = startW + e.clientX - startX;
      var h = startH + e.clientY - startY;
      var nw = clampPlayerW(w);
      var nh = clampPlayerH(h);
      playerEl.style.width = nw + "px";
      playerEl.style.height = nh + "px";
      playerEl.classList.add("sized");
      if (el.root) {
        el.root.style.setProperty("--bd-player-w", nw + "px");
        el.root.style.setProperty("--bd-player-h", nh + "px");
      }
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      var r = playerEl.getBoundingClientRect();
      var g = playerGeom();
      g.w = Math.round(r.width);
      g.h = Math.round(r.height);
      savePlayerGeom(g);
      toast("播放器 " + g.w + "×" + g.h + "，已记住");
    }
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  // 浮窗坐标：浮窗是 absolute，会相对「最近的定位祖先」定位。
  // .im-msg / .im-chat 这些祖先都带定位或 transform，直接写 left/top 会算到它们身上，
  // 实测 658+352=1010 就是这样来的。所以浮窗时把宿主改成 .im-shell（铺满视口、position:fixed），
  // 坐标系就直接等于视口坐标，写多少就是多少。
  function floatHost() {
    return (el.root && el.root.querySelector(".im-shell")) || el.root || document.body;
  }
  function floatOrigin() {
    var host = floatHost();
    var r = host.getBoundingClientRect();
    return { x: r.left + (host.clientLeft || 0), y: r.top + (host.clientTop || 0) };
  }
  function viewportToFloat(x, y) {
    var o = floatOrigin();
    return { x: Math.round(x - o.x), y: Math.round(y - o.y) };
  }
  function floatToViewport(playerEl) {
    var r = playerEl.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top) };
  }
  function clampFloatPos(playerEl, x, y) {
    // 按视口钳死：否则换个窗口尺寸重进，旧坐标会把浮窗推到屏幕外，看起来就是「点不动」
    var vw = window.innerWidth || 1200;
    var vh = window.innerHeight || 900;
    var w = playerEl.offsetWidth || 720;
    var h = playerEl.offsetHeight || 405;
    var maxX = Math.max(0, vw - w - 8);
    var maxY = Math.max(0, vh - Math.min(h, 80) - 8);
    return {
      x: Math.round(Math.min(Math.max(0, x || 0), maxX)),
      y: Math.round(Math.min(Math.max(0, y || 0), maxY))
    };
  }
  // 入参、出参统一用「视口坐标」，内部再换算成相对定位祖先的偏移
  function setFloatViewportPos(playerEl, vx, vy) {
    // 用 absolute 而不是 fixed：fixed 在根节点（本身 fixed）里会被当成「相对包含块」，
    // 写进去的 left/top 跟眼睛看到的位置对不上，拖起来就飘。absolute 相对最近的定位祖先，
    // 这里把它交给 .im-shell（铺满视口的 fixed 层），坐标系就是确定的视口坐标。
    playerEl.style.position = "absolute";
    var p = clampFloatPos(playerEl, vx, vy);
    var local = viewportToFloat(p.x, p.y);
    playerEl.style.left = local.x + "px";
    playerEl.style.top = local.y + "px";
    playerEl.style.right = "auto";
    playerEl.style.bottom = "auto";
    playerEl.style.margin = "0";
    return p;
  }
  function applyFloatPos(playerEl) {
    if (!playerEl || !playerEl.classList.contains("float")) return;
    // 这里不要写 position:fixed —— 会和 setFloatViewportPos 里的 absolute 打架，
    // 导致坐标系在两种参照系之间跳，拖起来就飘。
    playerEl.style.zIndex = "10000";
    playerEl.style.maxWidth = "none";
    var g = playerGeom();
    setFloatViewportPos(playerEl, g.x, g.y);
  }
  function bindPlayerFloat(playerEl) {
    var bar = playerEl.querySelector(".bd-player-bar");
    if (!bar || bar.dataset.bound) return;
    bar.dataset.bound = "1";
    var dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    bar.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("[data-pbtn]")) return;
      dragging = true;
      var r = playerEl.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = r.left; startTop = r.top;
      document.body.style.userSelect = "none";
      e.preventDefault();
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      setFloatViewportPos(playerEl, startLeft + e.clientX - startX, startTop + e.clientY - startY);
      e.preventDefault();
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
      var v = floatToViewport(playerEl);
      var g = playerGeom();
      g.x = v.x;
      g.y = v.y;
      savePlayerGeom(g);
    }
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }
  // 播放器窗口开关：在「聊天内」和「浮在整页之上」之间切换
  function setPlayerFloat(playerEl, on) {
    var float = typeof on === "boolean" ? on : !playerEl.classList.contains("float");
    // 注意：绝对不能把播放器挂到 body 下面。
    // 皮肤有一条「隐藏原站页面」的规则 html.im-theme body > *:not(#biliding-root) { visibility:hidden;
    // pointer-events:none }，一旦移出根节点，浮窗就会被连带隐藏 + 不接受点击，表现为「点不动、拖不动」。
    // 但也必须离开 .im-msg 这层带定位的祖先，否则 absolute 的 left/top 会算到它身上。
    // 折中：浮窗时挂到 .im-shell（根节点内、铺满视口的 fixed 层），收回时插回原位置。
    var host = floatHost();
    if (float) {
      if (playerEl.parentNode !== host) {
        playerEl._bdFloatParent = playerEl.parentNode;
        playerEl._bdFloatNext = playerEl.nextSibling;
        host.appendChild(playerEl);
      }
      playerEl.style.zIndex = "10000";
      playerEl.style.position = "absolute";
      playerEl.style.maxWidth = "none";
    } else {
      if (playerEl._bdFloatParent) {
        if (playerEl._bdFloatNext && playerEl._bdFloatNext.parentNode === playerEl._bdFloatParent) {
          playerEl._bdFloatParent.insertBefore(playerEl, playerEl._bdFloatNext);
        } else {
          playerEl._bdFloatParent.appendChild(playerEl);
        }
        playerEl._bdFloatParent = null;
        playerEl._bdFloatNext = null;
      }
      playerEl.style.position = "";
      playerEl.style.zIndex = "";
      playerEl.style.maxWidth = "";
      playerEl.style.left = "";
      playerEl.style.top = "";
      playerEl.style.right = "";
      playerEl.style.bottom = "";
    }
    playerEl.classList.toggle("float", float);
    if (el.root) el.root.classList.toggle("player-float", float);
    var g = playerGeom();
    g.float = float;
    if (float) {
      // 每次开始浮窗都按当前视口重新落位：旧坐标可能在别的窗口尺寸下已被判为屏幕外
      var w = playerEl.offsetWidth || g.w || 720;
      var p = clampFloatPos(playerEl, Math.round((window.innerWidth || 1200) / 2 - w / 2), 72);
      g.x = p.x;
      g.y = p.y;
    } else {
      // 收回聊天区：浮窗时可以拉到比聊天列还宽，收回来后必须按聊天区重新夹一次，
      // 否则会残留超出聊天列的宽度，把聊天区压出横向滚动条。
      var d2 = state.playerDef || playerDefaults();
      var room = Math.max(d2.min, chatAreaWidth());
      var back = Math.min(clampPlayerW(Number(lsGet(LS.playerW, 0)) || d2.preset), room);
      state.playerW = back;
      lsSet(LS.playerW, String(back));
      var hh = clampPlayerH(Number(lsGet("biliding-player-h", 0)) || Math.round(back * 9 / 16));
      applyPlayerW(back);
      applyPlayerBox(back, hh, false);
    }
    savePlayerGeom(g);
    applyFloatPos(playerEl);
    var btn = playerEl.querySelector('[data-pbtn="float"]');
    if (btn) {
      btn.innerHTML = float ? SVG.shrink : SVG.resize;
      btn.title = float ? "收回聊天（Esc）" : "浮窗 / 自由缩放";
    }
    toast(float ? "浮窗模式：拖顶部把手可移动，右下角可自由调宽高" : "已收回聊天区");
    return float;
  }

  function togglePlayerFull(playerEl, on) {
    var full = typeof on === "boolean" ? on : !playerEl.classList.contains("full");
    playerEl.classList.toggle("full", full);
    if (el.root) el.root.classList.toggle("player-full", full);
    var btn = playerEl.querySelector('[data-pbtn="full"]');
    if (btn) btn.innerHTML = full ? SVG.shrink : SVG.expand;
    // 退出全屏后按当前聊天区宽度重算一次
    if (!full && el.root) {
      refreshPlayerVars();
      applyFloatPos(playerEl);
    }
    if (document.fullscreenElement && !full) {
      try { document.exitFullscreen(); } catch (e) { /* ignore */ }
    }
  }

  function openPlayerSizeMenu(anchor) {
    [].slice.call(document.querySelectorAll(".bd-size-menu")).forEach(function (m) { m.remove(); });
    var d = state.playerDef || playerDefaults();
    var limit = chatAreaWidth();
    var cur = Number(lsGet(LS.playerW, 0)) || d.preset;
    var presets = [
      { label: "小", w: 480 },
      { label: "中", w: 720 },
      { label: "大", w: 960 },
      { label: "铺满聊天区", w: 0 }
    ];
    var menu = document.createElement("div");
    menu.className = "bd-size-menu";
    menu.innerHTML = '<label class="bd-size-control"><span>播放器宽度</span>' +
      '<input type="range" min="240" max="1600" step="10" value="' + cur + '" aria-label="播放器宽度">' +
      '<output>' + cur + 'px</output></label>' +
      presets.map(function (p, i) {
      // 档位超过聊天区宽度时会一起被夹到上限，只给真正匹配的那一档打勾
      var real = p.w ? Math.min(p.w, limit) : limit;
      var on = Math.abs(real - cur) < 32 && (i === presets.length - 1 || p.w <= limit);
      return '<div class="it' + (on ? " on" : "") + '" data-w="' + real + '">' +
        '<span>' + p.label + '</span><span class="k">' + real + "px</span></div>";
    }).join("") +
      '<div class="sep"></div>' +
      '<div class="it" data-pact="float"><span>浮窗（自由缩放 / 拖动）</span><span class="k">' +
      (playerGeom().float ? "开" : "关") + '</span></div>' +
      '<div class="it" data-pact="full">' + '<span>全屏</span><span class="k">Esc 退出</span></div>' +
      '<div class="it" data-pact="blur">' +
      '<span>会议背景（模糊本页）</span><span class="k">' + (state.blur ? "开" : "关") + '</span></div>' +
      '<div class="sep"></div>' +
      '<div class="it" data-pact="title"><span>改标签页标题</span><span class="k">Esc 取消</span></div>';
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = Math.round(Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8)) + "px";
    menu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))) + "px";
    var widthSlider = menu.querySelector('input[type="range"]');
    widthSlider.max = String(Math.max(240, Math.min(1600, Math.floor((window.innerWidth || 1600) - 32))));
    widthSlider.value = String(Math.min(Number(widthSlider.value), Number(widthSlider.max)));
    var widthOutput = menu.querySelector("output");
    widthSlider.addEventListener("input", function () {
      var player = document.querySelector(".bd-player.float") || el.chat.querySelector(".bd-player");
      var w = setPlayerWidth(Number(widthSlider.value), player);
      widthOutput.value = w + "px";
      widthOutput.textContent = w + "px";
    });
    menu.addEventListener("click", function (e) {
      var it = e.target.closest(".it");
      if (!it) return;
      var player = document.querySelector(".bd-player.float") || el.chat.querySelector(".bd-player");
      if (it.dataset.pact === "full") {
        menu.remove();
        if (player) togglePlayerFull(player, true);
        return;
      }
      if (it.dataset.pact === "float") {
        menu.remove();
        if (player) setPlayerFloat(player);
        return;
      }
      if (it.dataset.pact === "blur") {
        menu.remove();
        setBlur(!state.blur);
        if (player) menu.remove();
        return;
      }
      if (it.dataset.pact === "title") {
        menu.remove();
        editAppTitle();
        return;
      }
      if (!it.dataset.w) return;
      var w = setPlayerWidth(Number(it.dataset.w), player);
      menu.remove();
      toast("播放器宽度 " + w + "px");
    });
    setTimeout(function () {
      document.addEventListener("mousedown", function off(ev) {
        if (menu.contains(ev.target)) return;
        menu.remove();
        document.removeEventListener("mousedown", off);
      });
    }, 0);
  }

  // ---------- 播放源 ----------
  // 使用官方轻量嵌入播放器，避免在 iframe 内再加载整张 B 站视频页及其复杂应用脚本。
  function findSitePlayerTpl() {
    try {
      var out = [];
      // 站内播放器是 B站自己的页面，样式表同源，cssRules 读得到
      for (var i = 0; i < document.styleSheets.length; i++) {
        var ss = document.styleSheets[i], rules;
        try { rules = ss.cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (var j = 0; j < rules.length; j++) if (rules[j].cssText) out.push(rules[j].cssText);
      }
      var text = out.join("\n");
      var alias = /bilipugins\/svg\/icons\.svg#([A-Za-z]{1,3})-player\.([A-Za-z0-9]{6,}-[0-9]+)/.exec(text);
      var d = playerDefaults();
      if (alias) d.name = "site";
      d.cn = alias ? (alias[2].charCodeAt(0) % 9) + 1 : 1;
      state.playerDef = d;
      return d;
    } catch (e) {
      state.playerDef = playerDefaults();
      return state.playerDef;
    }
  }
  function embedSrc(bvid, page) {
    var d = state.playerDef || playerDefaults();
    var tpl = String(d.tpl || playerDefaults().tpl);
    return tpl.replace(/__BVID__/g, encodeURIComponent(bvid)).replace(/__P__/g, page || 1);
  }
  function playFrameHtml(bvid, page) {
    return '<div class="bd-player-main"><iframe src="' + esc(embedSrc(bvid, page)) + '" ' +
      'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen scrolling="no" frameborder="0"></iframe></div>';
  }
  function startPlayback(playerEl, bvid, page) {
    var main = playerEl.querySelector(".bd-player-main");
    if (!main) {
      main = document.createElement("div");
      main.className = "bd-player-main";
      playerEl.insertBefore(main, playerEl.firstChild);
    }
    main.innerHTML = '<iframe src="' + esc(embedSrc(bvid, page)) + '" ' +
      'allow="autoplay; fullscreen; picture-in-picture" allowfullscreen scrolling="no" frameborder="0"></iframe>';
    var poster = playerEl.querySelector(".poster");
    if (poster) poster.remove();
    playerEl.classList.add("playing");
  }
  function playerToolsHtml() {
    return '<div class="bd-player-tools">' +
      '<button data-pbtn="float" title="浮窗 / 自由缩放">' + (playerGeom().float ? SVG.shrink : SVG.resize) + '</button>' +
      '<button data-pbtn="size" title="播放器大小">' + SVG.resize + '</button>' +
      '<button data-pbtn="full" title="全屏">' + SVG.expand + '</button>' +
      '<button data-pbtn="go" title="在浏览器新标签打开">' + SVG.export + '</button>' +
      '</div>';
  }
  function bindPlayerTools(playerEl, bvid) {
    playerEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pbtn]");
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute("data-pbtn");
      if (act === "size") { openPlayerSizeMenu(b); return; }
      if (act === "float") { setPlayerFloat(playerEl); return; }
      if (act === "full") { togglePlayerFull(playerEl); return; }
      if (act === "go") { try { window.open("https://www.bilibili.com/video/" + bvid + "/", "_blank"); } catch (err) { toast("浏览器拦截了新标签"); } return; }
    });
    bindPlayerFloat(playerEl);
    // 只在 Esc 时退出全屏 / 浮窗；用 once 的独立监听避免多次绑定
    if (el.onEscFull) document.removeEventListener("keydown", el.onEscFull);
    el.onEscFull = function (e) {
      if (e.key !== "Escape") return;
      if (playerEl.classList.contains("full")) { togglePlayerFull(playerEl, false); return; }
      // 浮窗模式下 Esc 先收回聊天区（焦点在 iframe 里时这个监听收不到，属正常限制）
      if (playerEl.classList.contains("float")) setPlayerFloat(playerEl, false);
    };
    document.addEventListener("keydown", el.onEscFull);
  }


  // 顶栏「最大化」：有播放器就全屏播放器，否则把聊天区铺满
  function togglePlayerFullOnChat() {
    var player = el.chat && el.chat.querySelector(".bd-player");
    if (player) { togglePlayerFull(player); return; }
    toast("当前会话没有视频，窗口按钮只做样子");
  }

  // 会议背景：模糊本页，降低侧后方的可读性
  function setBlur(on) {
    state.blur = !!on;
    lsSet(LS.blur, state.blur ? "1" : "0");
    if (el.root) {
      el.root.classList.toggle("page-blur", state.blur);
      [].slice.call(el.root.querySelectorAll('[data-act="blur"]')).forEach(function (btn) {
        btn.classList.toggle("on", state.blur);
        if (btn.classList.contains("im-win")) btn.innerHTML = state.blur ? SVG["wall-off"] : SVG.wall;
        else btn.setAttribute("title", state.blur ? "关闭会议背景" : "会议背景");
      });
    }
  }
  // 改标签页标题：弹一个自己的输入框（不弹系统的「此网页说…」）
  function editAppTitle() { openTitleDialog(); }
  function openTitleDialog() {
    [].slice.call(document.querySelectorAll(".bd-title-dlg")).forEach(function (m) { m.remove(); });
    var cs = el.root ? getComputedStyle(el.root) : null;
    var dlg = document.createElement("div");
    dlg.className = "bd-title-dlg";
    dlg.innerHTML = '<div class="hd">标签页标题</div>' +
      '<div class="row"><input type="text" value="' + esc(lsGet(LS.title, "")) + '" placeholder="' + esc(appTitle()) + '" maxlength="40"></div>' +
      '<div class="hint">留空 = 恢复默认；保存后浏览器标签页立即变为该文字。</div>' +
      '<div class="ft"><button class="ghost" data-do="cancel">取消</button><button class="ok" data-do="save">保存</button></div>';
    document.body.appendChild(dlg);
    var inp = dlg.querySelector("input");
    var anchor = el.root && el.root.querySelector(".im-tb-apptitle");
    var r = anchor ? anchor.getBoundingClientRect() : { left: 120, top: 10, bottom: 34 };
    dlg.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 300))) + "px";
    dlg.style.top = Math.round(r.bottom + 8) + "px";
    if (cs) {
      dlg.style.setProperty("--c-panel", cs.getPropertyValue("--c-panel") || "#fff");
      dlg.style.setProperty("--c-line", cs.getPropertyValue("--c-line") || "#E2E6EE");
      dlg.style.setProperty("--c-text", cs.getPropertyValue("--c-text") || "#1F2329");
      dlg.style.setProperty("--c-text3", cs.getPropertyValue("--c-text3") || "#86909C");
      dlg.style.setProperty("--c-accent", cs.getPropertyValue("--c-accent") || "#1A7AF8");
    }
    inp.focus(); inp.select();
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest("[data-do]");
      if (!b) return;
      if (b.dataset.do === "save") {
        setAppTitle(inp.value);
        toast("标签页标题已改为「" + appTitle() + "」");
      }
      dlg.remove();
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { dlg.querySelector('[data-do="save"]').click(); }
      if (e.key === "Escape") { dlg.remove(); }
    });
  }
  // ======================= 18.7 登录态 / 临时关闭皮肤 =======================
  // 为什么要这一节：
  // 1) 播放器如果嵌 player.bilibili.com/player.html，那是「外嵌版」播放器，它本来就只给未登录的精简清晰度；
  // 2) 想登录就得去 passport，但皮肤把原站整页藏掉了，登录成功后页面看不见、也没法用原生播放器；
  // 3) 所以这里补两件事：能查登录态，以及能「临时关闭皮肤」回到原站，登录完再切回来。

  var LS_SKIN_OFF = "biliding-skin-off";
  var LOGIN_URL = "https://passport.bilibili.com/login?gourl=" + encodeURIComponent(location.href.split("#")[0]);

  // 登录态：走 nav 接口（fetchJson 已带 credentials，能读到站点 cookie）
  function refreshAccount() {
    if (MOCK) { applyAccount(MOCK.me); return; }
    fetchJson(API + "/x/web-interface/nav").then(function (j) {
      var d = (j && j.data) || {};
      applyAccount(d.isLogin && d.face ? { name: d.uname, face: toHttp(d.face), mid: d.mid } : null);
    }).catch(function () { applyAccount(null); });
  }
  function applyAccount(me) {
    state.me = me || null;
    state.isLogin = !!(me && me.name);
    paintMe();
    paintLoginEntry();
  }

  // 右上角/侧栏的「登录」入口：未登录时高亮，已登录时显示账号
  function paintLoginEntry() {
    if (!el.root) return;
    var name = state.me && state.me.name ? state.me.name : "";
    [].slice.call(el.root.querySelectorAll('[data-act="login"]')).forEach(function (b) {
      b.classList.toggle("on", !!state.isLogin);
      b.setAttribute("title", state.isLogin ? ("已登录：" + name + "（点此查看登录说明）") : "未登录：点此登录（清晰度受限）");
    });
  }

  // 登录说明浮层：passport 不允许被 iframe 嵌（X-Frame-Options），
  // 所以这里不嵌登录页，而是给一个明确的跳转按钮 + 登录后切回来的指引。
  function openLoginDialog() {
    [].slice.call(document.querySelectorAll(".bd-login-dlg")).forEach(function (m) { m.remove(); });
    var dlg = document.createElement("div");
    dlg.className = "bd-login-dlg";
    var who = state.isLogin && state.me && state.me.name ? state.me.name : "";
    dlg.innerHTML = '<div class="hd">' + (state.isLogin ? "账号与清晰度" : "登录后才能看高清") + '</div>' +
      '<div class="st">' + (state.isLogin
        ? '当前已登录 <b>' + esc(who) + '</b>，视频按网页端同款线路播放。'
        : '未登录时播放器只提供精简清晰度（约 360P/480P），且部分视频会提示登录。') + '</div>' +
      '<div class="tip">B站的登录页禁止被其它页面内嵌，所以登录要在新标签页里完成。' +
      '登录成功回到本站后，皮肤会自动感知到登录态。</div>' +
      '<div class="ft">' +
      '<button class="ghost" data-do="off">临时关闭皮肤</button>' +
      '<button class="ok" data-do="go">' + (state.isLogin ? "重新登录" : "打开登录页") + '</button>' +
      '</div>';
    document.body.appendChild(dlg);
    centerDialog(dlg);
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest("[data-do]");
      if (!b) return;
      if (b.dataset.do === "go") {
        try { window.open(LOGIN_URL, "_blank"); } catch (err) { toast("浏览器拦截了新标签"); }
        toast("登录完成后回到本页，皮肤会自动识别登录态");
      } else if (b.dataset.do === "off") {
        skinOn(false, true);
      }
      dlg.remove();
    });
  }

  function centerDialog(dlg) {
    var cs = el.root ? getComputedStyle(el.root) : null;
    if (cs) {
      dlg.style.setProperty("--c-panel", cs.getPropertyValue("--c-panel") || "#fff");
      dlg.style.setProperty("--c-line", cs.getPropertyValue("--c-line") || "#E2E6EE");
      dlg.style.setProperty("--c-text", cs.getPropertyValue("--c-text") || "#1F2329");
      dlg.style.setProperty("--c-text3", cs.getPropertyValue("--c-text3") || "#86909C");
      dlg.style.setProperty("--c-accent", cs.getPropertyValue("--c-accent") || "#1A7AF8");
    }
  }

  // ---------- 临时关闭皮肤（逃生通道） ----------
  // 关掉之后：原站恢复可见、可点、可右键，B站自己的播放器和登录流程都能正常用。
  var SKIN_OFF = lsGet(LS_SKIN_OFF, "0") === "1";

  function skinOn(on, persist) {
    SKIN_OFF = !on;
    if (persist) lsSet(LS_SKIN_OFF, SKIN_OFF ? "1" : "0");
    applySkinOff();
    toast(SKIN_OFF ? "皮肤已临时关闭，登录 / 高清播放请用原站；按 Ctrl+Shift+L 或点右下角按钮可恢复"
                   : "皮肤已恢复");
  }

  function applySkinOff() {
    var html = document.documentElement;
    if (SKIN_OFF) {
      html.classList.remove(ROOT_CLASS);
      html.classList.remove(DARK_CLASS);
    } else {
      html.classList.add(ROOT_CLASS);
      applyDark();
    }
    // 原站节点：皮肤开时用 visibility:hidden 藏起来，关时恢复
    var kids = document.body ? document.body.children : [];
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (!n.id || n.id === "biliding-root") continue;
      if (n.tagName === "SCRIPT" || n.tagName === "STYLE") continue;
      if (n.classList && (n.classList.contains("im-toast-wrap") || n.classList.contains("bd-restore-btn"))) continue;
      n.style.visibility = SKIN_OFF ? "" : "hidden";
      n.style.pointerEvents = SKIN_OFF ? "" : "none";
    }
    if (SKIN_OFF) {
      // 皮肤根节点也藏掉，避免挡住原站
      if (el.root) el.root.style.display = "none";
      if (el.toastWrap) el.toastWrap.style.display = "none";
      ensureRestoreButton(true);
    } else {
      if (el.root) el.root.style.display = "";
      if (el.toastWrap) el.toastWrap.style.display = "";
      ensureRestoreButton(false);
    }
  }

  // 皮肤关着的时候，得留一个能点回来的入口（fixed 小按钮，不依赖皮肤）
  var restoreBtn = null;
  function ensureRestoreButton(show) {
    if (!show) {
      if (restoreBtn) { restoreBtn.remove(); restoreBtn = null; }
      return;
    }
    if (restoreBtn || !document.body) return;
    var b = document.createElement("button");
    b.className = "bd-restore-btn";
    b.type = "button";
    b.textContent = "恢复 B钉 皮肤";
    b.title = "Ctrl+Shift+L";
    b.addEventListener("click", function () { skinOn(true, true); });
    document.body.appendChild(b);
    restoreBtn = b;
  }

  // 快捷键：Ctrl+Shift+L 开关皮肤（和浏览器地址栏 Focus 冲突的可能性最低）
  function bindSkinOffHotkey() {
    document.addEventListener("keydown", function (e) {
      if (!e.ctrlKey || !e.shiftKey || e.altKey) return;
      if (String(e.key).toLowerCase() !== "l" && e.code !== "KeyL") return;
      e.preventDefault();
      skinOn(SKIN_OFF, true);
    }, true);
  }
  // ======================= 22. 启动 =======================
  var CSS = CSS_CORE + CSS_DING + CSS_FEISHU + CSS_WECOM;

  function injectStyle() {
    var s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement("style");
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = CSS;
  }

  // 登录态查询统一走 refreshAccount（57-account.js），这里保留 loadMe 名字供既有调用点使用
  function loadMe() { refreshAccount(); }

  function paintMe() {
    var box = el.root && el.root.querySelector(".im-me");
    if (!box) return;
    state.isLogin = !!(state.me && state.me.name);
    if (state.me && state.me.face) {
      box.innerHTML = '<img src="' + esc(state.me.face) + '" alt="" referrerpolicy="no-referrer">';
    } else {
      box.innerHTML = '<span class="ph">稳</span>';
    }
    var st = el.root.querySelector(".im-tb-status b");
    if (st && state.me && state.me.name) st.textContent = state.me.name;
    if (typeof paintLoginEntry === "function") paintLoginEntry();
  }

  // 冒泡阶段拦截 <a> 点击：页面自己的处理器先跑，再阻止整页跳转
  function bindLinkIntercept() {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      if (e.target.closest && e.target.closest("#biliding-root")) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      if (a.target === "_blank" || a.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== 0 && e.button !== undefined)) return;
      var url;
      try { url = new URL(a.getAttribute("href"), location.origin); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname !== "/" && !ROUTE_RE.test(url.pathname)) return;
      // file:// 预览页（preview/harness.html）在根目录之外，不能当成站点首页
      if (!MOCK && location.protocol !== "http:" && location.protocol !== "https:") return;
      e.preventDefault();
      navTo(url.pathname + url.search);
    });
  }

  function hookHistory() {
    function wrap(name) {
      var orig = history[name];
      if (typeof orig !== "function" || orig.__biliding) return;
      var patched = function () {
        var ret = orig.apply(this, arguments);
        try { scheduleRoute(); } catch (e) { /* ignore */ }
        return ret;
      };
      patched.__biliding = true;
      try { history[name] = patched; } catch (e) { /* ignore */ }
    }
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", function () { applyRoute(); });
    window.addEventListener("hashchange", function () { scheduleRoute(); });
  }

  var routeTimer = null;
  function scheduleRoute() {
    clearTimeout(routeTimer);
    routeTimer = setTimeout(applyRoute, 60);
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    // 先把皮肤关/开的状态定下来：若是「临时关闭」状态，原站要原样放出来，
    // 不能先 hideOriginalPage() 再补救（那样原站会被藏掉一拍，登录页就白跳了）。
    if (SKIN_OFF) {
      document.documentElement.classList.remove(ROOT_CLASS);
    } else {
      document.documentElement.classList.add(ROOT_CLASS);
      applyDark();
    }
    injectStyle();
    paintFavicon();
    installTitleObserver();
    syncTitle(true);
    if (!MOCK && !SKIN_OFF) hideOriginalPage();
    buildShell();
    bindSkinOffHotkey();
    bindLinkIntercept();
    hookHistory();
    refreshAccount();
    applyRoute();
    findSitePlayerTpl();
    refreshPlayerVars();
    setBlur(state.blur);
    if (SKIN_OFF) applySkinOff();
    window.addEventListener("resize", function () {
      if (!el.root) return;
      refreshPlayerVars();
      var pl = el.chat && el.chat.querySelector(".bd-player");
      if (pl) applyFloatPos(pl);
    });
    if (!MOCK) {
      var lastHref = location.href;
      setInterval(function () {
        if (location.href !== lastHref) { lastHref = location.href; applyRoute(); }
        // 站内会反复改写标题 / 图标，定时兜底
        syncTitle();
      }, 1200);
    }
    // 右键菜单拦截要在页面自带的脚本之前生效
    installContextMenuGuard();
  }

  function hideOriginalPage() {
    if (SKIN_OFF) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", hideOriginalPage, { once: true });
      return;
    }
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.id === "biliding-root" || n.tagName === "SCRIPT" || n.tagName === "STYLE") continue;
      if (n.classList && n.classList.contains("im-toast-wrap")) continue;
      n.style.visibility = "hidden";
      n.style.pointerEvents = "none";
    }
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  if (!document.body) {
    var t = setInterval(function () {
      if (document.body) { clearInterval(t); start(); }
    }, 30);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
})();
