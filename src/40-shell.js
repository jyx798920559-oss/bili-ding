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
