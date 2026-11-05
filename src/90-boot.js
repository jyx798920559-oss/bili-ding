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
    window.addEventListener("resize", function () { if (el.root) refreshPlayerVars(); });
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
