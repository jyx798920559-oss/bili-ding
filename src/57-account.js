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
