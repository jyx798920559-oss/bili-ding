// ==UserScript==
// @name         B钉 · B站 IM 皮肤（钉钉 / 飞书 / 企业微信）
// @namespace    biliding.local
// @version      2.0.0
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
  if (!IS_TOP) return;
  if (!MOCK && !/^www\.bilibili\.com$|^search\.bilibili\.com$/.test(HOST)) return;

  var ROOT_CLASS = "im-theme";
  var DARK_CLASS = "im-dark";
  var STYLE_ID = "biliding-style";
  var FAVICON_ID = "biliding-favicon";
  var LS = {
    skin: "biliding-skin",
    dark: "biliding-dark",
    mode: "biliding-color-mode",
    listW: "biliding-list-width",
    railW: "biliding-rail-width",
    navW: "biliding-nav-width",
    org: "biliding-org-name",
    mask: "biliding-mask",
    playerW: "biliding-player-width"
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
  var NAV2_GROUPS = [
    { name: "前装一期", keys: ["car", "tech", "sports"] },
    { name: "小分组", keys: ["documentary", "film"] },
    { name: "客户甲", keys: ["knowledge", "music"] },
    { name: "工程机", keys: ["game", "douga"] },
    { name: "客户乙", keys: ["ent", "life"] },
    { name: "售后支持", keys: ["food", "fashion"] },
    { name: "顾南乔", keys: ["dance", "kichiku"] }
  ];

  // 首屏兜底会话（真实站也保留：让工作区看起来有人）
  var DECOY_CONVS = [
    { id: "sys:1", name: "【IPMT】QC-8项目组", tag: "内部群", preview: "林望舒: 这个是云枢日制件，你需要下…", time: "09:32", avatar: "E", color: "#1A87FF", unread: 12, mute: true, members: 8 },
    { id: "sys:2", name: "鹰眼 2.0软件&算法计划（研发）", tag: "内部群", preview: "周砚: 撤回了一条消息", time: "09:12", avatar: "E", color: "#4D8DFF", unread: 3, mute: true, members: 24 },
    { id: "sys:3", name: "陈亦然", preview: "只有一台", time: "昨天", avatar: "婷", color: "#8A93A0", members: 0 },
    { id: "sys:4", name: "张与安", tag: "部门标签", preview: "因为这个题，所以我接了一个扩展坞", time: "昨天", avatar: "杰", color: "#FF6B35", read: true, members: 0 },
    { id: "sys:5", name: "海外车队加装项目组…", tag: "内部群", preview: "祁远: 叠加之前何工确认过，后天我会再次…", time: "昨天", avatar: "宇", color: "#00C56C", unread: 17, mute: true, members: 12 },
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
    me: null,
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
  var SKIN_FAVICON = {
    dingtalk: { bg: ["#2B6BE4", "#0E5AD6"], text: "钉" },
    feishu: { bg: ["#3370FF", "#1A56E8"], text: "飞" },
    wecom: { bg: ["#2A8AFF", "#1769D2"], text: "企" }
  };
  function paintFavicon() {
    var cfg = SKIN_FAVICON[SKIN_ID] || SKIN_FAVICON.dingtalk;
    var size = 32, c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var grad = g.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, cfg.bg[0]); grad.addColorStop(1, cfg.bg[1]);
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
    g.fillStyle = "#fff"; g.font = "bold 19px 'Microsoft YaHei', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(cfg.text, size / 2, size / 2 + 1);
    var uri = c.toDataURL("image/png");
    var link = document.getElementById(FAVICON_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = FAVICON_ID; link.rel = "icon";
      (document.head || document.documentElement).appendChild(link);
    }
    link.setAttribute("href", uri);
    var old = document.querySelectorAll('link[rel~="icon"]:not(#' + FAVICON_ID + ')');
    for (var i = 0; i < old.length; i++) old[i].setAttribute("rel", "alternate-icon");
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
  html.im-theme body > *:not(#biliding-root):not(script):not(style):not(.im-toast-wrap) {
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
  .im-chat-body { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 14px 22px 8px; }

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

  /* 播放器贴片（宽度可调，见 JS 里的 bindPlayerResize） */
  .bd-player { width: min(var(--bd-player-w, 720px), 100%); aspect-ratio: 16 / 9;
    border-radius: 8px; overflow: hidden; background: #000; position: relative; }
  /* 太小时用 min-width 会溢出气泡，改为跟随容器压窄 */
  .bd-player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  /* 拖右下角改宽度，aspect-ratio 自动跟高度 */
  .bd-player-grip { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; z-index: 4;
    cursor: nwse-resize; touch-action: none;
    background: linear-gradient(135deg, transparent 46%, rgba(255,255,255,.72) 46%, rgba(255,255,255,.72) 54%,
      transparent 54%, transparent 68%, rgba(255,255,255,.72) 68%, rgba(255,255,255,.72) 76%, transparent 76%); }
  .bd-player-hint { position: absolute; left: 8px; bottom: 8px; z-index: 3; pointer-events: none;
    font-size: 11px; color: rgba(255,255,255,.9); background: rgba(0,0,0,.5); border-radius: 4px;
    padding: 2px 6px; opacity: 0; transition: opacity .16s; }
  .bd-player:hover .bd-player-hint { opacity: 1; }
  /* 尺寸菜单 */
  .bd-size-menu { position: fixed; z-index: 9998; min-width: 132px; padding: 6px; border-radius: 10px;
    background: var(--c-panel); border: 1px solid var(--c-line); box-shadow: 0 10px 30px rgba(17,24,39,.16);
    animation: bd-fade .12s ease both; }
  .bd-size-menu .it { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    height: 32px; padding: 0 10px; border-radius: 7px; font-size: 13px; color: var(--c-text); cursor: pointer; }
  .bd-size-menu .it:hover { background: var(--c-hover); }
  .bd-size-menu .it.on { color: var(--c-accent); font-weight: 500; }
  .bd-size-menu .it .k { font-size: 11px; color: var(--c-text3); }
  .bd-player .poster { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    cursor: pointer; background-size: cover; background-position: center; }
  .bd-player .poster::after { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.4); }
  .bd-player .poster .btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 16px; border-radius: 18px; background: rgba(255,255,255,.95); color: #17181A;
    font-size: 13px; font-weight: 500; border: 0; cursor: pointer; }
  .bd-player .poster .btn svg { width: 15px; height: 15px; }
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
  .im-skin-menu { position: fixed; z-index: 9998; min-width: 168px; padding: 6px; border-radius: 10px;
    background: var(--c-panel); border: 1px solid var(--c-line); box-shadow: 0 10px 30px rgba(17,24,39,.16);
    animation: bd-fade .12s ease both; }
  .im-skin-menu .it { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px;
    border-radius: 7px; font-size: 13px; color: var(--c-text); cursor: pointer; }
  .im-skin-menu .it:hover { background: var(--c-hover); }
  .im-skin-menu .it.on { color: var(--c-accent); font-weight: 500; }
  .im-skin-menu .it .sw { width: 14px; height: 14px; border-radius: 4px; flex: 0 0 14px; }
  .im-skin-menu .hd { font-size: 11px; color: var(--c-text3); padding: 4px 10px 6px; }

  /* toast */
  .im-toast-wrap { position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%); z-index: 9999;
    display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
  .im-toast { background: rgba(23,24,26,.88); color: #fff; font-size: 12.5px; padding: 8px 16px;
    border-radius: 6px; animation: bd-fade .18s ease both; max-width: 70vw; }

  /* 拖拽条 */
  .im-resizer { position: absolute; top: 0; right: -3px; bottom: 0; width: 6px; cursor: col-resize; z-index: 8; }
  .im-resizer:hover { background: linear-gradient(90deg, transparent, var(--c-accent-weak), transparent); }

  /* B站视频页 / 评论区专用排版 */
  .im-bubble.wide { max-width: min(760px, 84%); }
  .im-msg-main.wide { max-width: min(780px, 82%); }

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

  /* 企业微信没有独立标题栏，顶栏收进 rail / 列表 */
  .im-shell[data-skin="wecom"] .im-titlebar { display: none; }
  .im-shell[data-skin="wecom"] .im-body { padding-top: 0; }

  /* rail：选中项是蓝色实心，图标与文字转白 */
  .im-shell[data-skin="wecom"] .im-rail { border-right: 1px solid var(--c-line-weak); }
  .im-shell[data-skin="wecom"] .im-org { padding: 12px 12px 10px; }
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

  function titlebarHtml() {
    var sk = skin();
    if (!sk.titlebar) return "";
    return [
      '<div class="im-titlebar">',
      '  <div class="im-tb-left">',
      '    <div class="im-me" title="我的资料"></div>',
      '    <div class="im-tb-status"><b>小稳中</b> 在听 <span class="song">Northeast</span></div>',
      '  </div>',
      '  <div class="im-tb-center"><div class="im-tb-search">' + SVG.search +
      '<input type="search" data-act="global-search" placeholder="搜索或提问（Ctrl+Shift+F）" aria-label="搜索"></div></div>',
      '  <div class="im-tb-right">',
      '    <button class="im-win" data-act="skin" title="切换皮肤">' + SVG.skin + '</button>',
      '    <button class="im-win" data-act="dark" title="深色/浅色">' + (state.dark ? SVG.sun : SVG.moon) + '</button>',
      '    <span class="im-tb-sep"></span>',
      '    <button class="im-win" data-act="win-min" title="最小化">' + SVG.min + '</button>',
      '    <button class="im-win" data-act="win-max" title="最大化">' + SVG.max + '</button>',
      '    <button class="im-win close" data-act="win-close" title="关闭">' + SVG.close + '</button>',
      '  </div>',
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
      '    <div class="im-org-logo">锐</div>',
      '    <div class="im-org-meta"><div class="im-org-name">' + esc(sk.org) + '</div>' +
      '<div class="im-org-sub">云枢科技股份有限公司</div></div>',
      SVG.chevdown,
      '  </div>',
      '  <div class="im-rail-nav">' + items + groups + '</div>',
      '  <div class="im-rail-tail">',
      '    <button class="im-rail-item" data-act="collapse">' + SVG.back + '<span>收起</span></button>',
      '    <button class="im-rail-item" data-act="more">' + SVG.more + '<span>更多</span></button>',
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
        (n === "我创建的" ? SVG.chevdown.replace('class="', 'class="chev ') : "") +
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
      var darkBtn = t.closest && t.closest('[data-act="dark"]');
      if (darkBtn) { toggleDark(); return; }
      var winBtn = t.closest && t.closest('[data-act^="win-"]');
      if (winBtn) { toast("这是演示皮肤，窗口按钮只做样子"); return; }
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

  function openSkinMenu(anchor) {
    var old = document.querySelector(".im-skin-menu");
    if (old) { old.remove(); return; }
    var menu = document.createElement("div");
    menu.className = "im-skin-menu";
    var r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 100, bottom: 60 };
    menu.style.left = Math.max(8, Math.min(window.innerWidth - 190, r.left - 130)) + "px";
    menu.style.top = (r.bottom + 6) + "px";
    menu.innerHTML = '<div class="hd">切换皮肤</div>' + SKIN_ORDER.map(function (id) {
      var s = SKINS[id];
      var color = id === "dingtalk" ? "#1A7AF8" : id === "feishu" ? "#3370FF" : "#2A7CF7";
      return '<div class="it' + (id === SKIN_ID ? " on" : "") + '" data-skin-pick="' + id + '">' +
        '<span class="sw" style="background:' + color + '"></span>' + esc(s.label) +
        (id === SKIN_ID ? SVG.check : "") + '</div>';
    }).join("");
    document.body.appendChild(menu);
    menu.addEventListener("click", function (e) {
      var it = e.target.closest("[data-skin-pick]");
      if (!it) return;
      menu.remove();
      switchSkin(it.dataset.skinPick);
    });
    setTimeout(function () {
      document.addEventListener("click", function close(ev) {
        if (menu.contains(ev.target)) return;
        menu.remove();
        document.removeEventListener("click", close);
      }, { once: true });
    }, 0);
  }

  function switchSkin(id) {
    if (!SKINS[id] || id === SKIN_ID) return;
    SKIN_ID = id;
    lsSet(LS.skin, id);
    paintFavicon();
    el.root.remove();
    el.toastWrap.remove();
    [].slice.call(document.querySelectorAll(".im-skin-menu")).forEach(function (m) { m.remove(); });
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
      { i: "phone", t: "语音通话" },
      { i: "folder", t: "群文件" },
      { i: "adduser", t: "添加成员" },
      { i: "search", t: "搜索聊天记录" },
      { i: "settings", t: "会话设置" }
    ].map(function (a) {
      return '<button class="im-icon-btn" title="' + a.t + '" data-deco="' + a.t + '">' + SVG[a.i] + '</button>';
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

  function bindChatCommon() {
    if (!el.chat) return;
    scrollChatToBottom();
    el.chat.querySelectorAll(".im-icon-btn").forEach(function (b) {
      if (b.dataset.bound) return;
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
      '<div class="im-bubble' + (o.wide ? " wide" : "") + '">' +
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
    return msgHtml({
      me: !!o.me,
      author: o.author || item.owner,
      time: o.time || fmtRel(item.pubdate),
      face: o.face,
      avatar: (o.author || item.owner || "?").slice(0, 1),
      color: avColor(o.author || item.owner || ""),
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
        { a: "林望舒", t: "这个是云枢日制件，你需要下周一前给出结论。", time: now - 5400 },
        { a: "周砚", t: "@林望舒 收到，我这边先跑一遍台架。", time: now - 4800 },
        { a: "我", t: "我下午把测试记录同步到群里。", time: now - 720, me: true },
        { a: "林望舒", t: d.preview.replace(/^[^:]*:\s*/, ""), time: now - 300 }
      ]
      : [
        { a: d.name, t: "你还能挪一台D5X给软件预研调试通讯模块不？", time: now - 900, quote: "【陈亦然】你还能挪一台D5X给软件预研调试通讯模块不？", extra: '<div class="im-reply-link">1条回复</div>' },
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
      document.title = String(res.v.title || "").slice(0, 40) + " · B钉";
    }).catch(function (err) {
      el.chat.innerHTML = chatHeaderHtml({ name: "视频会话", sub: "打开失败" }) +
        '<div class="im-empty"><div>会话打开失败：' + esc(err.message) + '</div></div>' + composerHtml("", true);
      bindChatCommon();
    });
  }

  function paintVideoConversation(v, r, route) {
    var up = v.owner || {}, stat = v.stat || {};
    var poster = toHttp(v.pic || "");
    var embed = "//player.bilibili.com/player.html?bvid=" + encodeURIComponent(v.bvid) + "&page=" + (route.page || 1) + "&high_quality=1&danmaku=1&autoplay=0";
    var head = chatHeaderHtml({
      name: up.name || "视频会话", tag: "UP主",
      sub: (v.tname || "视频") + " · " + fmtCount(stat.view) + "播放 · " + fmtCount(stat.danmaku) + "弹幕",
      img: toHttp(up.face || ""), color: "#5B8DEF",
      extraActs: '<button class="im-icon-btn" title="播放器大小" data-act="player-size">' + SVG.resize + '</button>'
    });
    var card = '<div class="bd-player"><div class="poster" style="background-image:url(' + esc(poster) + ')">' +
      '<button class="btn">' + SVG.play + '播放视频</button></div>' +
      '<span class="bd-player-hint">拖右下角可调大小</span></div>' +
      '<div style="margin-top:9px;font-size:14px;font-weight:600;line-height:1.5">' + esc(v.title) + '</div>' +
      '<div class="bd-stats">' +
      '<span class="bd-stat">' + SVG.play + fmtCount(stat.view) + ' 播放</span>' +
      '<span class="bd-stat">' + SVG.comment + fmtCount(stat.reply) + ' 评论</span>' +
      '<span class="bd-stat">' + SVG.thumb + fmtCount(stat.like) + ' 点赞</span>' +
      '<span class="bd-stat">' + esc(v.tname || "") + '</span></div>' +
      (v.desc ? '<div style="margin-top:9px;font-size:12.5px;color:var(--c-text3);line-height:1.65;white-space:pre-wrap;max-height:96px;overflow:auto">' + esc(String(v.desc).slice(0, 600)) + '</div>' : '');

    var body = daysep(fmtDate(v.pubdate));
    body += msgHtml({
      author: up.name || "UP主", face: toHttp(up.face || ""), time: fmtDate(v.pubdate),
      body: card, wide: true
    });
    var replies = (r && r.replies) || [];
    if (replies.length) {
      body += daysep("评论区 · 共 " + ((r.page && r.page.count) || replies.length) + " 条");
      replies.forEach(function (rep) {
        var m = rep.member || {};
        var txt = String((rep.content && rep.content.message) || "");
        body += msgHtml({
          author: m.uname || "匿名", face: m.avatar ? toHttp(m.avatar) : "",
          avatar: (m.uname || "?").slice(0, 1), color: avColor(m.uname || ""),
          time: fmtRel(rep.ctime), body: esc(txt)
        });
      });
    } else {
      body += daysep("暂无评论");
    }
    el.chat.innerHTML = head + '<div class="im-chat-body">' + body + '</div>' +
      composerHtml("评论功能请到 B站原页面（B钉不代发）", true);
    bindChatCommon();
    bindDeco();
    var playerEl = el.chat.querySelector(".bd-player");
    if (playerEl) {
      bindPlayerResize(playerEl);
      applySavedPlayerWidth(el.chat);
      var posterEl = playerEl.querySelector(".poster");
      posterEl.addEventListener("click", function () {
        posterEl.parentNode.innerHTML = '<iframe src="' + embed + '" allow="autoplay; fullscreen" allowfullscreen scrolling="no" frameborder="0"></iframe>' +
          '<span class="bd-player-hint">拖右下角可调大小</span>';
        // iframe 里的点击到不了外层，用可拖动的手柄代替右下角
        var grip = document.createElement("div");
        grip.className = "bd-player-grip";
        playerEl.appendChild(grip);
        bindPlayerResize(playerEl, grip);
      });
      var sizeBtn = el.chat.querySelector('[data-act="player-size"]');
      if (sizeBtn) {
        sizeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          openPlayerSizeMenu(sizeBtn);
        });
      }
    }
  }

  // 播放器宽度：可拖右下角、也可弹菜单选档位，结果写 localStorage
  var PLAYER_MIN_W = 280, PLAYER_MAX_W = 1280;
  var PLAYER_PRESETS = [
    { label: "小", w: 480 },
    { label: "中", w: 720 },
    { label: "大", w: 960 },
    { label: "自适应", w: 0 }
  ];
  function setPlayerWidth(px, playerEl) {
    var root = el.root;
    var w = Number(px) || 0;
    if (w > 0) w = Math.min(PLAYER_MAX_W, Math.max(PLAYER_MIN_W, Math.round(w)));
    if (w > 0) root.style.setProperty("--bd-player-w", w + "px");
    else root.style.removeProperty("--bd-player-w");
    lsSet(LS.playerW, String(w));
    if (playerEl) playerEl.classList.toggle("sized", w > 0);
    return w;
  }
  function applySavedPlayerWidth(scope) {
    var w = Number(lsGet(LS.playerW, 0)) || 0;
    if (w <= 0) return;
    el.root.style.setProperty("--bd-player-w", w + "px");
    if (scope) [].slice.call(scope.querySelectorAll(".bd-player")).forEach(function (p) { p.classList.add("sized"); });
  }
  function bindPlayerResize(playerEl, handle) {
    var grip = handle || playerEl.querySelector(".bd-player-grip");
    if (!grip || grip.dataset.bound) return;
    grip.dataset.bound = "1";    var dragging = false, startX = 0, startW = 0;
    grip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true; startX = e.clientX;
      startW = playerEl.getBoundingClientRect().width;
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault(); e.stopPropagation();
    });
    grip.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      setPlayerWidth(startW + e.clientX - startX, playerEl);
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      var w = Math.round(playerEl.getBoundingClientRect().width);
      setPlayerWidth(w, playerEl);
      toast("播放器宽度 " + w + "px，已记住");
    }
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  }
  function openPlayerSizeMenu(anchor) {
    [].slice.call(document.querySelectorAll(".bd-size-menu")).forEach(function (m) { m.remove(); });
    var cur = Number(lsGet(LS.playerW, 0)) || 0;
    var menu = document.createElement("div");
    menu.className = "bd-size-menu";
    menu.innerHTML = PLAYER_PRESETS.map(function (p) {
      var on = p.w === 0 ? cur === 0 : Math.abs(p.w - cur) < 24;
      return '<div class="it' + (on ? " on" : "") + '" data-w="' + p.w + '">' +
        '<span>' + p.label + '</span><span class="k">' + (p.w ? p.w + "px" : "铺满") + '</span></div>';
    }).join("");
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 4) + "px";
    menu.style.left = Math.round(Math.min(r.left, window.innerWidth - 150)) + "px";
    menu.addEventListener("click", function (e) {
      var it = e.target.closest(".it");
      if (!it) return;
      var w = setPlayerWidth(Number(it.dataset.w), el.chat.querySelector(".bd-player"));
      menu.remove();
      toast(w ? "播放器宽度 " + w + "px" : "播放器宽度：自适应");
    });
    setTimeout(function () {
      document.addEventListener("mousedown", function off(ev) {
        if (menu.contains(ev.target)) return;
        menu.remove();
        document.removeEventListener("mousedown", off);
      });
    }, 0);
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
    try { history.pushState(null, "", href); } catch (e) { location.href = href; return; }
    applyRoute();
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

  function loadMe() {
    if (MOCK && MOCK.me) {
      state.me = MOCK.me;
      paintMe();
      return;
    }
    fetchJson(API + "/x/web-interface/nav").then(function (j) {
      var d = (j && j.data) || {};
      if (d.isLogin && d.face) {
        state.me = { name: d.uname, face: toHttp(d.face) };
      }
      paintMe();
    }).catch(function () { paintMe(); });
  }

  function paintMe() {
    var box = el.root && el.root.querySelector(".im-me");
    if (!box) return;
    if (state.me && state.me.face) {
      box.innerHTML = '<img src="' + esc(state.me.face) + '" alt="" referrerpolicy="no-referrer">';
    } else {
      box.innerHTML = '<span class="ph">稳</span>';
    }
    var st = el.root.querySelector(".im-tb-status b");
    if (st && state.me && state.me.name) st.textContent = state.me.name;
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
    document.documentElement.classList.add(ROOT_CLASS);
    applyDark();
    injectStyle();
    paintFavicon();
    if (!MOCK) hideOriginalPage();
    buildShell();
    bindLinkIntercept();
    hookHistory();
    loadMe();
    applyRoute();
    if (!MOCK) {
      var lastHref = location.href;
      setInterval(function () {
        if (location.href !== lastHref) { lastHref = location.href; applyRoute(); }
      }, 1200);
    }
  }

  function hideOriginalPage() {
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
