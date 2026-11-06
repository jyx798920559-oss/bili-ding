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
