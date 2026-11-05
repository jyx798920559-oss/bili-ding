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
