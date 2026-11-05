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
    blur: "biliding-page-blur"
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
