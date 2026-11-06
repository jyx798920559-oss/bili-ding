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
