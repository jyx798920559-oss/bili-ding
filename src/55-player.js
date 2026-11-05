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
      tpl: '//player.bilibili.com/player.html?bvid=__BVID__&page=__P__&high_quality=1&autoplay=0',
      cn: 1
    };
  }

  function clampPlayerW(w) {
    var d = state.playerDef || playerDefaults();
    return Math.min(d.max, Math.max(d.min, Math.round(Number(w) || d.preset)));
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
  var currentW = 0;
  function applyPlayerW(w) {
    currentW = w;
    if (!el.root) return;
    el.root.style.setProperty("--bd-player-w", w + "px");
    [].slice.call(document.querySelectorAll("#biliding-root .im-msg-main.wide")).forEach(function (m) {
      var b = m.querySelector(".im-bubble.wide");
      var pl = m.querySelector(".bd-player");
      if (!b || !pl) return;
      // 气泡是 border-box，左右各 11px 内边距 + 1px 边框，所以要比播放器宽 24px 才装得下
      var bw = w + 24;
      b.style.maxWidth = "none";
      b.style.boxSizing = "border-box";
      b.style.width = bw + "px";
      pl.style.width = w + "px";
      pl.style.maxWidth = "100%";
      // 消息列要比气泡再宽一点（头像列 + 间距），否则气泡会被 74% 的旧规则压回去
      m.style.maxWidth = (bw + 40) + "px";
    });
  }

  function refreshPlayerVars() {
    if (!el.root) return;
    var d = state.playerDef || playerDefaults();
    var limit = Math.max(d.min, chatAreaWidth());
    var saved = Number(lsGet(LS.playerW, 0)) || 0;
    var w = clampPlayerW(saved || d.preset);
    if (w > limit) w = limit;
    var player = el.chat && el.chat.querySelector(".bd-player");
    if (player) player.classList.toggle("sized", !!saved);
    state.playerW = w;
    applyPlayerW(w);
  }
  function setPlayerWidth(px, playerEl) {
    var d = state.playerDef || playerDefaults();
    var limit = Math.max(d.min, chatAreaWidth());
    var w = clampPlayerW(px);
    if (w > limit) w = limit;
    // 夹到上限时也存「用户点的是哪一档」，否则下次进来会被重新夹小、看起来像没生效
    state.playerW = w;
    applyPlayerW(w);
    lsSet(LS.playerW, String(clampPlayerW(px)));
    if (playerEl) playerEl.classList.add("sized");
    return w;
  }
  function applySavedPlayerWidth(scope) {
    refreshPlayerVars();
    if (scope) [].slice.call(scope.querySelectorAll(".bd-player")).forEach(function (p) {
      if (Number(lsGet(LS.playerW, 0)) > 0) p.classList.add("sized");
    });
  }

  function bindPlayerResize(playerEl, handle) {
    var grip = handle || playerEl.querySelector(".bd-player-grip");
    if (!grip || grip.dataset.bound) return;
    grip.dataset.bound = "1";
    var dragging = false, startX = 0, startW = 0;
    grip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startW = playerEl.getBoundingClientRect().width;
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
      e.stopPropagation();
    });
    grip.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      setPlayerWidth(startW + e.clientX - startX, playerEl);
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      var w = Math.round(playerEl.getBoundingClientRect().width);
      toast("播放器宽度 " + w + "px，已记住");
    }
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  }

  function togglePlayerFull(playerEl, on) {
    var full = typeof on === "boolean" ? on : !playerEl.classList.contains("full");
    playerEl.classList.toggle("full", full);
    if (el.root) el.root.classList.toggle("player-full", full);
    var btn = playerEl.querySelector('[data-pbtn="full"]');
    if (btn) btn.innerHTML = full ? SVG.shrink : SVG.expand;
    // 退出全屏后按当前聊天区宽度重算一次
    if (!full && el.root) refreshPlayerVars();
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
    menu.innerHTML = presets.map(function (p, i) {
      // 档位超过聊天区宽度时会一起被夹到上限，只给真正匹配的那一档打勾
      var real = p.w ? Math.min(p.w, limit) : limit;
      var on = Math.abs(real - cur) < 32 && (i === presets.length - 1 || p.w <= limit);
      return '<div class="it' + (on ? " on" : "") + '" data-w="' + real + '">' +
        '<span>' + p.label + '</span><span class="k">' + real + "px</span></div>";
    }).join("") +
      '<div class="sep"></div>' +
      '<div class="it" data-pact="full">' + '<span>全屏</span><span class="k">Esc 退出</span></div>' +
      '<div class="it" data-pact="blur">' +
      '<span>会议背景（模糊本页）</span><span class="k">' + (state.blur ? "开" : "关") + '</span></div>' +
      '<div class="sep"></div>' +
      '<div class="it" data-pact="title"><span>改标签页标题</span><span class="k">Esc 取消</span></div>';
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = Math.round(Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8)) + "px";
    menu.style.left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))) + "px";
    menu.addEventListener("click", function (e) {
      var it = e.target.closest(".it");
      if (!it) return;
      var player = el.chat.querySelector(".bd-player");
      if (it.dataset.pact === "full") {
        menu.remove();
        if (player) togglePlayerFull(player, true);
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
  // 站点自带的播放器组件源码里就有 player.bilibili.com 的 iframe。
  // 建一个同源 iframe 放进去，再把这个片段搬进聊天卡：播放器本身的清晰度 / 登录态 / 弹幕 / 全屏全部保留。
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
      if (act === "full") { togglePlayerFull(playerEl); return; }
      if (act === "go") { try { window.open("https://www.bilibili.com/video/" + bvid + "/", "_blank"); } catch (err) { toast("浏览器拦截了新标签"); } return; }
    });
    // 只在 Esc 时退出全屏；用 once 的独立监听避免多次绑定
    if (el.onEscFull) document.removeEventListener("keydown", el.onEscFull);
    el.onEscFull = function (e) {
      if (e.key !== "Escape") return;
      if (playerEl.classList.contains("full")) togglePlayerFull(playerEl, false);
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
